import { cn } from '@/lib/utils'

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-group"
      className={cn('flex flex-col gap-4', className)}
      {...props}
    />
  )
}

function Field({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field"
      className={cn('group/field flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function FieldLabel({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="field-label"
      className={cn(
        'flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function FieldError({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-error"
      className={cn('text-sm text-destructive', className)}
      {...props}
    />
  )
}

export { Field, FieldDescription, FieldError, FieldGroup, FieldLabel }
