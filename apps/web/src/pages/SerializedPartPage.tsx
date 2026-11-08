import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { Link, useParams } from 'react-router';

import type { InstallPartResult, SerializedPartDetails } from '@raceshop/api-client';
import {
  Alert,
  Button,
  Dialog,
  LifeGauge,
  Select,
  Spinner,
  StatusBadge,
  TextField,
} from '@raceshop/ui';

import {
  useCars,
  useInstallPart,
  useRemovePart,
  useRetirePart,
  useSerializedPart,
} from '../api/inventory';
import { canManageInventory, useAuth } from '../auth/auth';
import styles from '../app.module.css';
import {
  formatDateTime,
  formatNumber,
  formatUsage,
  lifeStatus,
  partStatus,
  unitName,
} from '../format';
import { usePageTitle } from '../usePageTitle';
import { QueryError } from './StatusPages';

type Outcome = { tone: 'ok' | 'warning' | 'danger'; title: string; detail?: string } | null;

export function SerializedPartPage() {
  const { id = '' } = useParams();
  const part = useSerializedPart(id);
  const { user } = useAuth();
  const [outcome, setOutcome] = useState<Outcome>(null);
  usePageTitle(part.data ? part.data.serialNumber : 'Serialized part');

  if (part.isPending) return <Spinner label="Loading part" />;
  if (part.isError) return <QueryError error={part.error} what="this part" />;

  const { data } = part;
  const life = lifeStatus[data.lifeStatus];
  const status = partStatus[data.status];

  return (
    <div className={styles.page}>
      <div>
        <h1>{data.serialNumber}</h1>
        <p className={styles.subtitle}>
          <Link to={`/parts/${data.partId}`}>{data.partNumber}</Link> · {data.description}
        </p>
      </div>

      <section className={styles.summary} aria-label="Life and status">
        <LifeGauge
          size="large"
          percent={data.lifeUsedPercent}
          status={data.lifeStatus}
          label={`Life used, ${data.serialNumber}`}
        />
        <dl className={styles.details}>
          <div>
            <dt>Status</dt>
            <dd>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </dd>
          </div>
          <div>
            <dt>Life</dt>
            <dd>
              <StatusBadge tone={life.tone}>{life.label}</StatusBadge>
            </dd>
          </div>
          <div>
            <dt>Used</dt>
            <dd>
              {formatUsage(data.accumulatedUsage, data.lifeUnit)} of{' '}
              {formatUsage(data.lifeLimit, data.lifeUnit)}
            </dd>
          </div>
          <div>
            <dt>On car</dt>
            <dd>
              {data.currentInstall
                ? `#${data.currentInstall.carNumber} since ${formatDateTime(data.currentInstall.installedAt)}`
                : '—'}
            </dd>
          </div>
        </dl>
      </section>

      {outcome && (
        <Alert tone={outcome.tone} title={outcome.title}>
          {outcome.detail}
        </Alert>
      )}

      {canManageInventory(user) ? (
        <PartActions part={data} onOutcome={setOutcome} />
      ) : (
        <p className={styles.muted}>Only parts managers can install, remove or retire parts.</p>
      )}
    </div>
  );
}

function PartActions({
  part,
  onOutcome,
}: {
  part: SerializedPartDetails;
  onOutcome: (outcome: Outcome) => void;
}) {
  const [open, setOpen] = useState<'install' | 'remove' | 'retire' | null>(null);
  const close = () => {
    setOpen(null);
  };

  return (
    <section aria-labelledby="actions-heading">
      <h2 id="actions-heading">Actions</h2>
      <div className={styles.actions}>
        {part.status === 'InStock' && (
          <Button
            variant="primary"
            onClick={() => {
              setOpen('install');
            }}
            disabled={part.lifeStatus === 'Expired'}
          >
            Install on a car
          </Button>
        )}
        {part.status === 'Installed' && (
          <Button
            variant="primary"
            onClick={() => {
              setOpen('remove');
            }}
          >
            Remove from car
          </Button>
        )}
        {part.status === 'InStock' && (
          <Button
            variant="danger"
            onClick={() => {
              setOpen('retire');
            }}
          >
            Retire part
          </Button>
        )}
      </div>
      {part.status === 'InStock' && part.lifeStatus === 'Expired' && (
        <p className={styles.muted}>This part has reached its life limit and can't be installed.</p>
      )}

      {open === 'install' && <InstallDialog part={part} onClose={close} onOutcome={onOutcome} />}
      {open === 'remove' && <RemoveDialog part={part} onClose={close} onOutcome={onOutcome} />}
      {open === 'retire' && <RetireDialog part={part} onClose={close} onOutcome={onOutcome} />}
    </section>
  );
}

interface ActionDialogProps {
  part: SerializedPartDetails;
  onClose: () => void;
  onOutcome: (outcome: Outcome) => void;
}

function failure(title: string, error: Error): Outcome {
  return { tone: 'danger', title, detail: error.message };
}

function installOutcome(result: InstallPartResult): Outcome {
  return result.lifeStatus === 'Warning'
    ? {
        tone: 'warning',
        title: 'Installed, near life limit',
        detail: `This part has used ${formatNumber(result.lifeUsedPercent)}% of its life. Plan a replacement.`,
      }
    : { tone: 'ok', title: 'Installed' };
}

function InstallDialog({ part, onClose, onOutcome }: ActionDialogProps) {
  const cars = useCars();
  const install = useInstallPart(part.id);
  const [carId, setCarId] = useState('');
  const [error, setError] = useState<string | undefined>();

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!carId) {
      setError('Choose a car.');
      return;
    }
    install.mutate(carId, {
      onSuccess: (result) => {
        onOutcome(installOutcome(result));
        onClose();
      },
      onError: (reason) => {
        onOutcome(failure('Install failed', reason));
        onClose();
      },
    });
  }

  return (
    <Dialog
      open
      title={`Install ${part.serialNumber}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="install-form" variant="primary" disabled={install.isPending}>
            {install.isPending ? 'Installing…' : 'Install'}
          </Button>
        </>
      }
    >
      <form id="install-form" onSubmit={submit} noValidate>
        <Select
          label="Car"
          placeholder={cars.isPending ? 'Loading cars…' : 'Choose a car'}
          options={(cars.data ?? []).map((car) => ({
            value: car.id,
            label: `#${car.carNumber} (${car.team})`,
          }))}
          value={carId}
          error={error}
          onChange={(event) => {
            setCarId(event.target.value);
            setError(undefined);
          }}
        />
      </form>
    </Dialog>
  );
}

function RemoveDialog({ part, onClose, onOutcome }: ActionDialogProps) {
  const remove = useRemovePart(part.id);
  const [usage, setUsage] = useState('');
  const [error, setError] = useState<string | undefined>();
  const unit = unitName(part.lifeUnit);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(usage);
    if (usage.trim() === '' || !Number.isFinite(value) || value < 0) {
      setError(`Enter the ${unit} run on this car (0 or more).`);
      return;
    }
    remove.mutate(value, {
      onSuccess: () => {
        onOutcome({ tone: 'ok', title: 'Removed from car' });
        onClose();
      },
      onError: (reason) => {
        onOutcome(failure('Remove failed', reason));
        onClose();
      },
    });
  }

  return (
    <Dialog
      open
      title={`Remove ${part.serialNumber}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="remove-form" variant="primary" disabled={remove.isPending}>
            {remove.isPending ? 'Removing…' : 'Remove'}
          </Button>
        </>
      }
    >
      <form id="remove-form" onSubmit={submit} noValidate>
        <TextField
          label={`${unit[0]?.toUpperCase() ?? ''}${unit.slice(1)} since install`}
          hint={`Added to the part's total of ${formatUsage(part.accumulatedUsage, part.lifeUnit)}.`}
          inputMode="decimal"
          value={usage}
          error={error}
          onChange={(event) => {
            setUsage(event.target.value);
            setError(undefined);
          }}
        />
      </form>
    </Dialog>
  );
}

function RetireDialog({ part, onClose, onOutcome }: ActionDialogProps) {
  const retire = useRetirePart(part.id);

  return (
    <Dialog
      open
      title={`Retire ${part.serialNumber}?`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            disabled={retire.isPending}
            onClick={() => {
              retire.mutate(undefined, {
                onSuccess: () => {
                  onOutcome({ tone: 'ok', title: 'Part retired' });
                  onClose();
                },
                onError: (reason) => {
                  onOutcome(failure('Retire failed', reason));
                  onClose();
                },
              });
            }}
          >
            {retire.isPending ? 'Retiring…' : 'Retire'}
          </Button>
        </>
      }
    >
      <p>A retired part can never be installed again. This can't be undone.</p>
    </Dialog>
  );
}
