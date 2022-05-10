import React, { createContext, Dispatch, FunctionComponent, useContext, useReducer } from 'react';
import { useDisclosure, UseDisclosureReturn } from '@chakra-ui/react';

type ModalAction =
  | { type: 'CREATE'; id: string }
  | { type: 'OPEN'; id: string }
  | { type: 'CLOSE'; id: string }


interface ModalState {
  modals: Partial<UseDisclosureReturn>
}

type ModalDispatch = Dispatch<ModalAction>;

const initialState: ModalState = {
  modals: {}
}

const ModalReducer = (state: ModalState, action: ModalAction) => {
  switch (action.type) {
    case 'CREATE':
      console.log(state, action);
      return {
        ...state,
        modals: {}
      };
    case 'OPEN':
      return {
        ...state,
        modals: {}
      };      
    case 'CLOSE':
      return {
        ...state,
        modals: {}
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