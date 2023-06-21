import useResizeObserver from '@react-hook/resize-observer'
import React from 'react'

export function useElementSize(
  cardDisplayRef: React.RefObject<HTMLDivElement>
): DOMRect {
  const [size, setSize] = React.useState<DOMRect>()

  React.useLayoutEffect(() => {
    setSize(cardDisplayRef.current?.getBoundingClientRect())
  }, [cardDisplayRef])

  useResizeObserver(cardDisplayRef, (entry) => {
    setSize(entry.contentRect)
  })

  return (
    size ?? cardDisplayRef.current?.getBoundingClientRect() ?? new DOMRect()
  )
}
