import type { Graph } from '../domain/graph'
import { serializeGraph, deserializeGraph } from '../domain/graph'

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
