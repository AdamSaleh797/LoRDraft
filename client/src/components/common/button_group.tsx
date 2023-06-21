import React from 'react';
import { Button } from 'client/components/common/button';
import style from './button_group.module.css';

interface ButtonData {
  id: string;
  label: string;
}

interface ButtonGroupProps {
  buttons: ButtonData[];
  selectedButton: string;
  onButtonClick: (buttonId: string) => void;
}

export function ButtonGroup(props:ButtonGroupProps) {
  return (
    <div className={style['button-group']}>
      {props.buttons.map((button) => (
        <Button
          key={button.id}
          className={`${style['material-button']} ${
            props.selectedButton === button.id ? style.selected : ''
          }`}
          onClick={() => {props.onButtonClick(button.id)}}
        >
          {button.label}
        </Button>
      ))}
    </div>
  );
}