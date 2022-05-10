import React, { useContext } from 'react';
import { ModalStateContext } from '@/context';

const useModalState = () => {
    return useContext(ModalStateContext);
}

export default useModalState;