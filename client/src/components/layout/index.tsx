import React from 'react'
import "./layout.css"
import { Draft } from "../draft"


export function Layout(props: {children: any}) {
    return (
        <div className='parent'>
            <div className='child'>
                {props.children}
            </div>
        </div>
    )
}