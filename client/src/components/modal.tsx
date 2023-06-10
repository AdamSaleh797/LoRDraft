// import { LoginComponent } from '../auth/login-component'
import { Button } from 'client/components/button'
import 'client/components/modal.css'
import React from 'react'

export function Modal({ setOpenModal }: { setOpenModal(b: boolean): void }) {
  return (
    <div className='modalBackground'>
      <div className='modalContainer'>
        <Button
          onClick={() => {
            setOpenModal(false)
          }}
        >
          Close &times;
        </Button>

        <div className='title'>
          <h3>Login | Registration</h3>
        </div>
        <div className='body'>
          {/* <LoginComponent></LoginComponent>{' '} */}
        </div>
        <div className='footer'>
          <Button
            className='#cancelBtn '
            onClick={() => {
              setOpenModal(false)
            }}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
