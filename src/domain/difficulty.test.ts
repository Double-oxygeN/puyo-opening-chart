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

import { describe, it, expect } from 'vitest'
import { PuyoColor } from './color'
import {
  Difficulty,
  DEFAULT_DIFFICULTY,
  getAvailableColors,
  DIFFICULTY_LABELS,
  ALL_DIFFICULTIES,
} from './difficulty'

describe('Difficulty', () => {
  it('デフォルト難易度は中辛', () => {
    expect(DEFAULT_DIFFICULTY).toBe(Difficulty.Medium)
  })

  it('全難易度が定義されている', () => {
    expect(ALL_DIFFICULTIES).toEqual([
      Difficulty.Mild,
      Difficulty.Medium,
      Difficulty.Hot,
    ])
  })

  it('全難易度にラベルが定義されている', () => {
    expect(DIFFICULTY_LABELS[Difficulty.Mild]).toBe('甘口')
    expect(DIFFICULTY_LABELS[Difficulty.Medium]).toBe('中辛')
    expect(DIFFICULTY_LABELS[Difficulty.Hot]).toBe('辛口')
  })
})

describe('getAvailableColors', () => {
  it('甘口は3色（赤・緑・青）', () => {
    const colors = getAvailableColors(Difficulty.Mild)
    expect(colors).toEqual([PuyoColor.Red, PuyoColor.Green, PuyoColor.Blue])
  })

  it('中辛は4色（赤・緑・青・黄）', () => {
    const colors = getAvailableColors(Difficulty.Medium)
    expect(colors).toEqual([
      PuyoColor.Red,
      PuyoColor.Green,
      PuyoColor.Blue,
      PuyoColor.Yellow,
    ])
  })

  it('辛口は5色（赤・緑・青・黄・紫）', () => {
    const colors = getAvailableColors(Difficulty.Hot)
    expect(colors).toEqual([
      PuyoColor.Red,
      PuyoColor.Green,
      PuyoColor.Blue,
      PuyoColor.Yellow,
      PuyoColor.Purple,
    ])
  })
})
