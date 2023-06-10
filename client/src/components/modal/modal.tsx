import React from 'react'
import './modal.css'

export function Modal({ setOpenModal }: { setOpenModal(b: boolean): void }) {
  return (
    <div className='modalBackground'>
      <div className='modalContainer'>
        <div className='titleCloseBtn'>
          <button
            onClick={() => {
              setOpenModal(false)
            }}
          >
            &times;
          </button>
        </div>
        <div className='title'>
          <h1>Are You Sure You Want to Continue?</h1>
        </div>
        <div className='body'>Login will come here</div>
        <div className='footer'>
          <button
            onClick={() => {
              setOpenModal(false)
            }}
            id='cancelBtn'
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setOpenModal(false)
            }}
            id='confirmBtn'
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
