import React, { useContext } from 'react';
import { ModalState, ModalStateContext } from '@/context';

const useModalState = (id: string) => {
    const context = useContext(ModalStateContext);
    if (!context) {
        // TODO throw error
    }

    const { modals } = context as ModalState;
    if (!modals) {
        // TODO throw error
    }

    return modals[id];
}

export default useModalState;