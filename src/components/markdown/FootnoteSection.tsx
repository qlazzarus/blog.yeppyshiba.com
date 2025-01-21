'use client';

import React, { ReactElement, ReactNode } from 'react';

import useFootnotesStore from '@/hooks/useFootnotesStore';

import OrderedList from './OrderedList';

function extractTextFromReactNode(node: ReactNode): string {
    // 1) 문자열 타입인 경우
    if (typeof node === 'string') {
        return node;
    }

    // 2) 배열(Fragments, 여러 자식 등)인 경우
    if (Array.isArray(node)) {
        // 각 아이템을 재귀적으로 처리한 뒤 합쳐서 반환
        return node.map(extractTextFromReactNode).join('');
    }

    // 3) React Element인 경우 (즉 JSX 태그)
    if (React.isValidElement(node)) {
        // 해당 요소의 children을 다시 extractTextFromReactNode 로 재귀
        return extractTextFromReactNode(
            (node as ReactElement<{ children?: ReactNode }>).props.children,
        );
    }

    // 그 밖에 null, undefined, boolean, number 등은 무시하거나 적절히 처리
    return '';
}

const FootnoteSection = ({ children }: { children: ReactNode }) => {
    const addFootnote = useFootnotesStore((state) => state.addFootnote);

    // 실제 DOM으로 렌더링하지 않을 것이므로, children을 순회하며 필요한 데이터만 추출
    React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child)) return;

        const childElement = child as ReactElement<{
            children?: ReactElement<{ id?: string; children?: ReactNode }>;
        }>;

        // child가 <ol>이라면, 그 안의 <li>를 찾아봄
        if (childElement.type === OrderedList) {
            React.Children.forEach(childElement.props.children, (entry) => {
                if (!React.isValidElement(entry)) return;

                const footnoteId = entry.props.id;
                // 2) 재귀 함수로 텍스트만 추출
                const liText = extractTextFromReactNode(entry.props.children).trim();

                // Zustand에 저장
                if (footnoteId) {
                    addFootnote(footnoteId, liText);
                }
            });
        }
    });

    // 실제로는 footnotes 섹션을 렌더하지 않음
    return null;
};

export default FootnoteSection;
