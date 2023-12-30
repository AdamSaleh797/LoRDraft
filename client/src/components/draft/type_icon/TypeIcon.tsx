import React from 'react';

import style from './TypeIcon.module.css';

import { CardCategory } from 'client/components/draft/TypeCategory';
import { ChampIcon } from 'client/components/draft/type_icon/champion_icon';
import { EquipmentIcon } from 'client/components/draft/type_icon/equipment_icon';
import { FollowerIcon } from 'client/components/draft/type_icon/follower_icon';
import { LandmarkIcon } from 'client/components/draft/type_icon/landmark_icon';
import { SpellIcon } from 'client/components/draft/type_icon/spell_icon';

export interface TypeIconProps {
  category: CardCategory;
}

export function TypeIcon(props: TypeIconProps) {
  switch (props.category) {
    case 'Champion':
      return (
        <div className={style.typeIconContainer}>
          <ChampIcon />
        </div>
      );
    case 'Follower':
      return (
        <div className={style.typeIconContainer}>
          <FollowerIcon />
        </div>
      );
    case 'Spell':
      return (
        <div className={style.typeIconContainer}>
          <SpellIcon />
        </div>
      );
    case 'Landmark':
      return (
        <div className={style.typeIconContainer}>
          <LandmarkIcon />
        </div>
      );
    case 'Equipment':
      return (
        <div className={style.typeIconContainer}>
          <EquipmentIcon />
        </div>
      );
  }
}
