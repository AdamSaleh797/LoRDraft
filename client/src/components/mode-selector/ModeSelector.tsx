import React, { useState } from 'react'

import { Button, ButtonGroup, ListItem } from 'client/components/common'

export function ModeSelector() {
  const [selectedDraftMode, setSelectedDraftMode] = useState<string>('hs')
  const [selectedRuling, setSelectedRuling] = useState<string>('eternal')
  const [selectedListItem, setSelectedListItem] = useState<string>('normal')

  const selectDraftMode = (buttonId: string) => {
    setSelectedDraftMode(buttonId)
  }

  const selectRuling = (buttonId: string) => {
    setSelectedRuling(buttonId)
  }

  const selectListItem = (key: string) => {
    setSelectedListItem(key)
  }

  const draftModeButtonData = [
    { id: 'hs', label: 'Hearthstone type Draft' },
    { id: 'mtg', label: 'MTG type Arena Draft' },
  ]

  const rulingButtonData = [
    { id: 'standard', label: 'Standard' },
    { id: 'eternal', label: 'Eternal' },
  ]

  function handleSubmit(): void {
    //this is only a mock function, real filtering needs to be implemented here!
    //I think you already did something like this Claytdog (DraftOptions/DraftFormat probably), maybe you (or we both together) can fuse it with this.
    //everything you don't have right now can stay mock-stuff for now, espacially the MTG draft
    let message = 'Selected Mode: '

    switch (selectedDraftMode) {
      case 'hs':
        message += 'Hearthstone, '
        break
      case 'mtg':
        message += 'MTG, '
        break
      default:
        message += 'error'
    }

    switch (selectedRuling) {
      case 'standard':
        message += 'Standard, '
        break
      case 'eternal':
        message += 'Eternal, '
        break
      default:
        message += 'error'
    }

    //further cases could be 'only Spells' and 'only Landmarks' or just a custom Option. But Im not so sure about this.
    //Custom Options are cool for the user, but we need to talk about what can be achievable and if we want to implement it since it will def be some work.
    switch (selectedListItem) {
      case 'normal':
        message += 'Normal'
        break
      case 'pauper':
        message += 'Pauper'
        break
      case 'pauperPlus':
        message += 'Pauper+'
        break
      case 'noChampions':
        message += 'No Champions'
        break
      case 'unitsOnly':
        message += 'Only Units'
        break
      default:
        message += 'error'
    }

    alert(message)
  }

  return (
    <div>
      <h4>Select your Draft Mode</h4>
      <ButtonGroup
        buttons={draftModeButtonData}
        selectedButton={selectedDraftMode}
        onButtonClick={selectDraftMode}
      />

      <hr></hr>

      <h4>Select your LoR Ruling</h4>
      <ButtonGroup
        buttons={rulingButtonData}
        selectedButton={selectedRuling}
        onButtonClick={selectRuling}
      />

      <hr></hr>

      <h4>Select one of our Special Modes</h4>
      <div className='list-container'>
        <ListItem
          key='normal'
          title='Normal'
          description='No restrictions'
          selected={selectedListItem === 'normal'}
          onClick={() => {
            selectListItem('normal')
          }}
        />
        <ListItem
          key='pauper'
          title='Pauper'
          description='only Commons'
          selected={selectedListItem === 'pauper'}
          onClick={() => {
            selectListItem('pauper')
          }}
        />
        <ListItem
          key='pauperPlus'
          title='pauper+'
          description='only commons and rare'
          selected={selectedListItem === 'pauperPlus'}
          onClick={() => {
            selectListItem('pauperPlus')
          }}
        />
        <ListItem
          key='noChampions'
          title='No Champions'
          description='this will exclude Champions'
          selected={selectedListItem === 'noChampions'}
          onClick={() => {
            selectListItem('noChampions')
          }}
        />
        <ListItem
          key='unitsOnly'
          title='only units'
          description='only commons and uncommons'
          selected={selectedListItem === 'unitsOnly'}
          onClick={() => {
            selectListItem('unitsOnly')
          }}
        />

        <h5>Start Draft with these Settings?</h5>
        <Button onClick={handleSubmit} buttonType='confirm'>
          Submit
        </Button>
      </div>
    </div>
  )
}
