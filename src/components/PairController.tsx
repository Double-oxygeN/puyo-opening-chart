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

import type { PairState } from '../domain/pair'
import { useKeyboardInput } from '../hooks/useKeyboardInput'

interface PairControllerProps {
  pairState: PairState
  onUpdatePairState: (state: PairState) => void
  onPlace: () => void
  onGoBack?: () => void
}

export default function PairController({
  pairState,
  onUpdatePairState,
  onPlace,
  onGoBack,
}: PairControllerProps) {
  useKeyboardInput({
    pairState,
    onUpdatePairState,
    onPlace,
    onGoBack,
  })

  return (
    <div className="flex flex-col items-center gap-2">
      {/* キー操作ガイド */}
      <div className="text-xs text-gray-400 text-center leading-relaxed">
        {'←→: 移動 / Z: 左回転 / X: 右回転'}
        <br />
        {'↓/Enter: 設置 / B: 1手戻す'}
      </div>
    </div>
  )
}
