import type { Graph } from '../domain/graph'
import {
  serializeGraph,
  deserializeGraph,
  validateGraph,
} from '../domain/graph'

const STORAGE_KEY = 'puyo-opening-chart:graph'

/** localStorage からグラフを読み込む。キーがない場合は null、パース失敗時も null */
export function loadGraph(): Graph | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY)
    if (json === null) return null
    const graph = deserializeGraph(json)
    if (graph === null) {
      console.error(
        'localStorage のグラフデータが不正です。データを無視します。',
      )
    }
    return graph
  } catch (e) {
    console.error('localStorage からの読み込みに失敗しました:', e)
    return null
  }
}

/** localStorage にグラフを保存する */
export function saveGraph(graph: Graph): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeGraph(graph))
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

/** グラフをJSONファイルとしてダウンロードする */
export function exportGraphToFile(graph: Graph): void {
  const json = serializeGraph(graph)
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

/** JSONファイルからグラフを読み込む。ファイル選択がキャンセルされた場合は null を返す */
export function importGraphFromFile(): Promise<Graph | null> {
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
          resolve(graph)
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
