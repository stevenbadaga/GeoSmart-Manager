import { Button } from './Button'
import { Modal } from './Modal'

export function ConfirmDialog({
  open,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="text-sm text-slate-700">{message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} type="button" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

