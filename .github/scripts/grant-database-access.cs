#:package Microsoft.Data.SqlClient@6.1.7
// Same security pin as api/Directory.Packages.props: SqlClient brings in Pkcs 9.0.11 (CVE-2026-84008, CVE-2026-70162).
#:package System.Security.Cryptography.Pkcs@10.0.14
// A one-off admin task: no native AOT, so no ILCompiler package (file-based apps enable AOT by default).
#:property PublishAot=false
// Grants the API's managed identity read/write access to the database. Run by deploy.yml as a
// .NET 10 file-based app: `dotnet run .github/scripts/grant-database-access.cs -- <args>`.
//
// It signs in the same way as the migrations (Entra ID through the pipeline's az login, as a member of
// the SQL admins group) and creates the user WITH SID = the identity's client ID, so no
// directory-read permission is needed. It is safe to run on every deploy.
//
// Args: <sql-server-fqdn> <database> <identity-name> <identity-client-id>
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;

if (args.Length != 4)
{
    Console.Error.WriteLine("Usage: grant-database-access <sql-server-fqdn> <database> <identity-name> <identity-client-id>");
    return 2;
}

var (server, database, identityName, clientIdText) = (args[0], args[1], args[2], args[3]);

// The name ends up in DDL (CREATE USER can't take a parameter), so allow only Azure resource-name characters.
if (!Regex.IsMatch(identityName, "^[A-Za-z0-9-]{1,128}$"))
{
    Console.Error.WriteLine($"Refusing unexpected identity name '{identityName}'.");
    return 2;
}

if (!Guid.TryParse(clientIdText, out var clientId))
{
    Console.Error.WriteLine($"'{clientIdText}' is not a client ID (GUID).");
    return 2;
}

// SQL Server stores an Entra principal's SID as the GUID's bytes in this order (Guid.ToByteArray).
var sid = "0x" + Convert.ToHexString(clientId.ToByteArray());
var connectionString =
    $"Server=tcp:{server},1433;Database={database};Authentication=Active Directory Default;Encrypt=True;Connect Timeout=120;";

const string Sql = """
    IF DATABASE_PRINCIPAL_ID(@name) IS NULL
        EXEC('CREATE USER ' + @quoted + ' WITH SID = ' + @sid + ', TYPE = E');
    EXEC('ALTER ROLE db_datareader ADD MEMBER ' + @quoted);
    EXEC('ALTER ROLE db_datawriter ADD MEMBER ' + @quoted);
    """;

await using var connection = new SqlConnection(connectionString);
await connection.OpenAsync();
await using var command = new SqlCommand(Sql, connection);
command.Parameters.AddWithValue("@name", identityName);
command.Parameters.AddWithValue("@quoted", $"[{identityName}]");
command.Parameters.AddWithValue("@sid", sid);
await command.ExecuteNonQueryAsync();

Console.WriteLine($"✓ {identityName} can read and write data in {database} (no schema rights).");
return 0;
