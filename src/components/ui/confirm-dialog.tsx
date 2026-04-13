import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog"
import { Button } from "./button"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void
}

export function ConfirmDialog({
  open, onOpenChange, title, description, 
  confirmText = "Confirmar", cancelText = "Cancelar",
  variant = "default", onConfirm
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>{cancelText}</Button>
        <Button variant={variant === 'destructive' ? 'destructive' : 'default'} onClick={() => { onConfirm(); onOpenChange(false); }}>
          {confirmText}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
