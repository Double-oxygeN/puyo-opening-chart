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

import type { Graph } from '../domain/graph'
import {
  serializeGraph,
  deserializeGraph,
  validateGraph,
} from '../domain/graph'
import type { Difficulty } from '../domain/difficulty'

const STORAGE_KEY = 'puyo-opening-chart:graph'

/** 保存データ: グラフ + 難易度 */
export interface SaveData {
  graph: Graph
  difficulty: Difficulty
}

/** localStorage からグラフと難易度を読み込む。キーがない場合は null、パース失敗時も null */
export function loadSaveData(): SaveData | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY)
    if (json === null) return null
    const graph = deserializeGraph(json)
    if (graph === null) {
      console.error(
        'localStorage のグラフデータが不正です。データを無視します。',
      )
      return null
    }

    const raw: unknown = JSON.parse(json)
    if (
      typeof raw !== 'object' ||
      raw === null ||
      !('difficulty' in raw) ||
      typeof (raw as Record<string, unknown>).difficulty !== 'string'
    ) {
      console.error(
        'localStorage の難易度データが不正です。データを無視します。',
      )
      return null
    }

    return {
      graph,
      difficulty: (raw as Record<string, unknown>).difficulty as Difficulty,
    }
  } catch (e) {
    console.error('localStorage からの読み込みに失敗しました:', e)
    return null
  }
}

/** localStorage にグラフと難易度を保存する */
export function saveSaveData(data: SaveData): void {
  try {
    const graphJson = serializeGraph(data.graph)
    const parsed = JSON.parse(graphJson) as object
    const withDifficulty = { ...parsed, difficulty: data.difficulty }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withDifficulty))
  } catch (e) {
    console.error('localStorage への保存に失敗しました:', e)
  }
}

/** localStorage からグラフデータを削除する */
export function clearGraph(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.error('localStorage からの削除に失敗しました:', e)
  }
}

/** グラフと難易度をJSONファイルとしてダウンロードする */
export function exportSaveDataToFile(data: SaveData): void {
  const graphJson = serializeGraph(data.graph)
  const parsed = JSON.parse(graphJson) as object
  const json = JSON.stringify({ ...parsed, difficulty: data.difficulty })
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'puyo-chart-export.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** JSONファイルからグラフと難易度を読み込む。ファイル選択がキャンセルされた場合は null を返す */
export function importSaveDataFromFile(): Promise<SaveData | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        try {
          const json = reader.result as string
          const graph = deserializeGraph(json)
          if (!graph) {
            reject(new Error('ファイルの形式が不正です。'))
            return
          }
          if (!validateGraph(graph)) {
            reject(new Error('データの整合性検証に失敗しました。'))
            return
          }

          const raw: unknown = JSON.parse(json)
          if (
            typeof raw !== 'object' ||
            raw === null ||
            !('difficulty' in raw) ||
            typeof (raw as Record<string, unknown>).difficulty !== 'string'
          ) {
            reject(new Error('難易度データが不正です。'))
            return
          }

          resolve({
            graph,
            difficulty: (raw as Record<string, unknown>)
              .difficulty as Difficulty,
          })
        } catch {
          reject(new Error('ファイルの読み込みに失敗しました。'))
        }
      }
      reader.onerror = () => {
        reject(new Error('ファイルの読み込みに失敗しました。'))
      }
      reader.readAsText(file)
    })

    input.click()
  })
}
