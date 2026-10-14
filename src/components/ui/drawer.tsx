import { ModalSurface, type DialogProps } from './dialog'

function Drawer(props: DialogProps) {
  return <ModalSurface {...props} variant="drawer" />
}

export { Drawer, type DialogProps as DrawerProps }
