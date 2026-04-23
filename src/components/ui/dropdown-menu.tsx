import * as React from 'react'
import { Menu } from '@base-ui-components/react/menu'
import { cn } from '@/lib/utils'

const DropdownMenu = Menu.Root
const DropdownMenuGroup = Menu.Group
const DropdownMenuPortal = Menu.Portal
const DropdownMenuSub = Menu.SubmenuRoot
const DropdownMenuRadioGroup = Menu.RadioGroup

type RenderableChild = React.ReactElement<Record<string, unknown>>

function isRenderableChild(child: React.ReactNode): child is RenderableChild {
  return React.isValidElement(child)
}

type TriggerProps = React.ComponentPropsWithoutRef<typeof Menu.Trigger> & {
  asChild?: boolean
}

const DropdownMenuTrigger = React.forwardRef<
  React.ComponentRef<typeof Menu.Trigger>,
  TriggerProps
>(({ asChild, children, ...props }, ref) => {
  if (asChild && isRenderableChild(children)) {
    return <Menu.Trigger ref={ref} render={children} {...props} />
  }

  return (
    <Menu.Trigger ref={ref} {...props}>
      {children}
    </Menu.Trigger>
  )
})
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

type ContentProps = Omit<React.ComponentPropsWithoutRef<typeof Menu.Popup>, 'align'> & {
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}

const DropdownMenuContent = React.forwardRef<
  React.ComponentRef<typeof Menu.Popup>,
  ContentProps
>(({ className, sideOffset = 4, align = 'center', children, ...props }, ref) => (
  <DropdownMenuPortal>
    <Menu.Positioner sideOffset={sideOffset} align={align}>
      <Menu.Popup
        ref={ref}
        className={cn(
          'z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-card p-1 text-foreground shadow-md outline-none',
          'data-[starting-style]:animate-in data-[ending-style]:animate-out',
          'data-[ending-style]:fade-out-0 data-[starting-style]:fade-in-0',
          'data-[ending-style]:zoom-out-95 data-[starting-style]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        {...props}
      >
        {children}
      </Menu.Popup>
    </Menu.Positioner>
  </DropdownMenuPortal>
))
DropdownMenuContent.displayName = 'DropdownMenuContent'

type ItemProps = React.ComponentPropsWithoutRef<typeof Menu.Item> & {
  inset?: boolean
  onSelect?: () => void
}

const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof Menu.Item>,
  ItemProps
>(({ className, inset, onSelect, onClick, ...props }, ref) => (
  <Menu.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors',
      'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      className,
    )}
    onClick={(event) => {
      onClick?.(event)
      onSelect?.()
    }}
    {...props}
  />
))
DropdownMenuItem.displayName = 'DropdownMenuItem'

const DropdownMenuLabel = React.forwardRef<
  React.ComponentRef<typeof Menu.GroupLabel>,
  React.ComponentPropsWithoutRef<typeof Menu.GroupLabel> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <Menu.GroupLabel
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-xs font-semibold text-muted-foreground',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

const DropdownMenuSeparator = React.forwardRef<
  React.ComponentRef<typeof Menu.Separator>,
  React.ComponentPropsWithoutRef<typeof Menu.Separator>
>(({ className, ...props }, ref) => (
  <Menu.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

type SubTriggerProps = React.ComponentPropsWithoutRef<typeof Menu.SubmenuTrigger> & {
  inset?: boolean
}

const DropdownMenuSubTrigger = React.forwardRef<
  React.ComponentRef<typeof Menu.SubmenuTrigger>,
  SubTriggerProps
>(({ className, inset, children, ...props }, ref) => (
  <Menu.SubmenuTrigger
    ref={ref}
    className={cn(
      'flex cursor-default gap-2 select-none items-center rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent',
      inset && 'pl-8',
      className,
    )}
    {...props}
  >
    {children}
  </Menu.SubmenuTrigger>
))
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger'

const DropdownMenuSubContent = React.forwardRef<
  React.ComponentRef<typeof Menu.Popup>,
  ContentProps
>(({ className, sideOffset = 4, align = 'center', children, ...props }, ref) => (
  <DropdownMenuPortal>
    <Menu.Positioner sideOffset={sideOffset} align={align}>
      <Menu.Popup
        ref={ref}
        className={cn(
          'z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-card p-1 text-foreground shadow-lg outline-none',
          'data-[starting-style]:animate-in data-[ending-style]:animate-out',
          'data-[ending-style]:fade-out-0 data-[starting-style]:fade-in-0',
          'data-[ending-style]:zoom-out-95 data-[starting-style]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        {...props}
      >
        {children}
      </Menu.Popup>
    </Menu.Positioner>
  </DropdownMenuPortal>
))
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent'

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
