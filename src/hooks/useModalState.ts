import React, { useContext } from 'react';
import { ModalState, ModalStateContext } from '@/context';

const useModalState = (id: string) => {
    const context = useContext(ModalStateContext);
    if (!context) {
        // TODO throw error
        return null;
    }

    const { modals } = context as ModalState;
    if (!modals) {
        // TODO throw error
        return null;
    }

    return modals[id];
}

export default useModalState;