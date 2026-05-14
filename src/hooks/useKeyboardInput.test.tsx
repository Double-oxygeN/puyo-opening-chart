// Copyright 2026 Yuya Shiratori
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PuyoColor } from '../domain/color'
import { createInitialPairState } from '../domain/pair'
import { useKeyboardInput } from './useKeyboardInput'

interface TestHarnessProps {
  onUpdatePairState: ReturnType<typeof vi.fn>
  onPlace: ReturnType<typeof vi.fn>
  onGoBack: ReturnType<typeof vi.fn>
}

function TestHarness({
  onUpdatePairState,
  onPlace,
  onGoBack,
}: TestHarnessProps) {
  const outsideRef = useRef<HTMLDivElement>(null)

  useKeyboardInput({
    pairState: createInitialPairState({
      axis: PuyoColor.Red,
      child: PuyoColor.Blue,
    }),
    onUpdatePairState,
    onPlace,
    onGoBack,
  })

  return (
    <>
      <textarea aria-label="メモ" />
      <div
        ref={outsideRef}
        data-testid="outside"
        tabIndex={-1}
        onClick={() => outsideRef.current?.focus()}
      />
    </>
  )
}

describe('useKeyboardInput', () => {
  it('textarea の入力中は盤面ショートカットを処理しない', async () => {
    const user = userEvent.setup()
    const onUpdatePairState = vi.fn()
    const onPlace = vi.fn()
    const onGoBack = vi.fn()

    render(
      <TestHarness
        onUpdatePairState={onUpdatePairState}
        onPlace={onPlace}
        onGoBack={onGoBack}
      />,
    )

    await user.type(screen.getByRole('textbox', { name: 'メモ' }), 'zxb{Enter}')

    expect(screen.getByRole('textbox', { name: 'メモ' })).toHaveValue('zxb\n')
    expect(onUpdatePairState).not.toHaveBeenCalled()
    expect(onPlace).not.toHaveBeenCalled()
    expect(onGoBack).not.toHaveBeenCalled()
  })

  it('textarea からフォーカスが外れたら盤面ショートカットを処理する', async () => {
    const user = userEvent.setup()
    const onUpdatePairState = vi.fn()
    const onPlace = vi.fn()
    const onGoBack = vi.fn()

    render(
      <TestHarness
        onUpdatePairState={onUpdatePairState}
        onPlace={onPlace}
        onGoBack={onGoBack}
      />,
    )

    await user.click(screen.getByRole('textbox', { name: 'メモ' }))
    await user.click(screen.getByTestId('outside'))
    await user.keyboard('z{Enter}b')

    expect(onUpdatePairState).toHaveBeenCalledTimes(1)
    expect(onUpdatePairState).toHaveBeenCalledWith(
      expect.objectContaining({ rotation: 3 }),
    )
    expect(onPlace).toHaveBeenCalledTimes(1)
    expect(onGoBack).toHaveBeenCalledTimes(1)
  })
})
