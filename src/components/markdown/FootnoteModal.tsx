import { Box, Modal, Typography } from '@mui/material';
import React from 'react';

import useFootnotesStore from '@/hooks/useFootnotesStore';

interface FootnoteModalProps {
    open: boolean;
    onClose: () => void;
    footnoteId: string;
}

const FootnoteModal = ({ open, onClose, footnoteId }: FootnoteModalProps) => {
    const footnoteText = useFootnotesStore((state) => state.footnotes[footnoteId]);

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                sx={{
                    position: 'absolute' as const,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    p: 4,
                    backgroundColor: 'background.paper',
                    boxShadow: 24,
                }}
            >
                <Typography variant='body1' sx={{ mb: 2 }}>
                    {footnoteText || '(no footnote text)'}
                </Typography>
            </Box>
        </Modal>
    );
};

export default FootnoteModal;
