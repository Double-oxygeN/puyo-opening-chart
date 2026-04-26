import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the title', () => {
    render(<App />)
    expect(screen.getByText('ぷよぷよ通 初手研究チャート')).toBeInTheDocument()
  })

  it('does not show the board operation dialog initially', () => {
    render(<App />)
    expect(screen.queryByText('盤面操作')).not.toBeInTheDocument()
  })
})
