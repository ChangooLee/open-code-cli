/**
 * The kind of a Jupyter notebook cell.
 */
export type NotebookCellType = 'code' | 'markdown' | 'raw'

/**
 * An image extracted from a notebook cell output.
 */
export interface NotebookOutputImage {
  image_data: string
  media_type: 'image/png' | 'image/jpeg'
}

/**
 * A raw output entry as stored in the .ipynb file.
 */
export type NotebookCellOutput =
  | {
      output_type: 'stream'
      name?: string
      text: string | string[]
    }
  | {
      output_type: 'execute_result'
      data?: Record<string, string | string[] | undefined>
      execution_count?: number | null
      metadata?: Record<string, unknown>
    }
  | {
      output_type: 'display_data'
      data?: Record<string, string | string[] | undefined>
      metadata?: Record<string, unknown>
    }
  | {
      output_type: 'error'
      ename: string
      evalue: string
      traceback: string[]
    }

/**
 * A raw notebook cell as stored in the .ipynb file.
 */
export interface NotebookCell {
  cell_type: NotebookCellType
  id?: string
  source: string | string[]
  metadata?: Record<string, unknown>
  execution_count?: number | null
  outputs?: NotebookCellOutput[]
}

/**
 * A parsed .ipynb notebook document.
 */
export interface NotebookContent {
  cells: NotebookCell[]
  metadata: {
    language_info?: {
      name?: string
    }
  }
  nbformat: number
  nbformat_minor: number
}

/**
 * A processed output, ready to render into a tool result.
 */
export interface NotebookCellSourceOutput {
  output_type: string
  text?: string
  image?: NotebookOutputImage
}

/**
 * A processed notebook cell, ready to render into a tool result.
 */
export interface NotebookCellSource {
  cellType: NotebookCellType
  source: string
  execution_count?: number
  cell_id: string
  language?: string
  outputs?: NotebookCellSourceOutput[]
}
