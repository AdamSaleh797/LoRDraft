import React from 'react'

import { Buffer } from 'buffer'

import { SessionCred } from 'socket-msgs'

interface DraftFormatComponentProps {
  authInfo: SessionCred
}

export function DraftFormatComponent(props: DraftFormatComponentProps) {
  return (
    <div>
      <button onClick={() => {}}>STANDARD</button>
      <button onClick={() => {}}>ETERNAL</button>
    </div>
  )
}
