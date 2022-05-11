import React, { createContext, Dispatch, FunctionComponent, useReducer } from 'react';

type ModalAction =
  | { type: 'CREATE'; id: string }
  | { type: 'OPEN'; id: string }
  | { type: 'CLOSE'; id: string }


export type ModalState = {
  modals: {
    [id: string]: 'on' | 'off'
  }
}

export type ModalDispatch = Dispatch<ModalAction>;

const initialState: ModalState = {
  modals: {}
}

const ModalReducer = (state: ModalState, action: ModalAction) => {
  const { id, type } = action;
  const { modals } = state;

  switch (type) {
    case 'CREATE':
      if (!modals[id]) {
        modals[id] = 'off';
      }

      return {
        modals
      };
    case 'OPEN':
      if (modals[id]) {
        modals[id] = 'on';
      }

      return {
        modals
      };      
    case 'CLOSE':
      if (modals[id]) {
        modals[id] = 'off';
      }

      return {
        modals
      };      
    default:
      return state;
  }
}

export const ModalStateContext = createContext<ModalState | null>(null);
export const ModalDispatchContext = createContext<ModalDispatch | null>(null);

export const ModalProvider: FunctionComponent = ({ children }) => {
  const [state, dispatch] = useReducer(ModalReducer, initialState);

  return (
    <ModalStateContext.Provider value={state}>
      <ModalDispatchContext.Provider value={dispatch}>
        {children}
      </ModalDispatchContext.Provider>
    </ModalStateContext.Provider>
  );
};