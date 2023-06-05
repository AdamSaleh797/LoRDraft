import { isOk, Status } from 'lor_util'

interface StatusComponentProps {
  status: Status | null
}

export function StatusComponent(props: StatusComponentProps) {
  const status = props.status

  if (status === null || isOk(status)) {
    return <div />
  } else {
    const style = {
      color: 'red',
    }
    return <div style={style}>{status.message}</div>
  }
}
