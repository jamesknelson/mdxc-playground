import React, { Component, PropTypes } from 'react'
import createClassNamePrefixer from './createClassNamePrefixer'
import { MDXBreadboard } from './Breadboard'
import HighlightedCodeBlock from './HighlightedCodeBlock'


const cx = createClassNamePrefixer('fullscreenMDXBreadboardTheme')


export default {
  maxSinglePaneWidth: 999,
  
  renderBreadboard: function(props) {
    const {
      consoleMessages,
      transformedSource,
      transformError,
      executionError,

      renderEditorElement,
      renderMountElement,

      modes,
      modeActions,

      unwrapped,
      onToggleWrapped,
    } = props

    const activeModeCount = Object.values(modes).reduce((acc, x) => acc + x || 0, 0)

    let sourceLayout = {
      position: 'relative',
      flexBasis: 600,
      flexGrow: 0,
      flexShrink: 1,
    }
    if (activeModeCount === 1) {
      sourceLayout = {
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        right: 0,
      }
    }

    const secondaryLayout = {
      position: 'relative',
      flexBasis: 600,
      flexGrow: 1,
      flexShrink: 1,
      overflow: 'auto',
    }
      
    return (
      <div className={cx.root()}>
        <nav>
          { modes.transformed &&
            <span className={cx('wrapper', { active: !unwrapped })} onClick={onToggleWrapped}>Wrap</span>
          }
          <span className={cx('modes')}>
            <span className={cx('mode', { active: modes.transformed })} onClick={modeActions.selectTransformed}>Output</span>
            <span className={cx('mode', { active: modes.component })} onClick={modeActions.selectComponent}>Preview</span>
            { activeModeCount === 1 &&
              <span className={cx('mode', { active: modes.source })} onClick={modeActions.selectSource}>Source</span>
            }
          </span>
        </nav>
        { modes.source &&
          renderEditorElement({ layout: sourceLayout })
        }
        { modes.component &&
          <div className={cx('preview')} style={secondaryLayout}>
            {renderMountElement()}
          </div>
        }
        { modes.transformed &&
          <HighlightedCodeBlock
            className={cx('transformed')}
            language="javascript"
            source={transformedSource}
            style={secondaryLayout}
          />
        }
      </div>
    )
  },

  renderCode: function({ language, breadboard, source }) {
    if (breadboard) {
      return (
        <div style={{ maxWidth: 'none', width: '100%' }}>
          {breadboard}
        </div>
      )
    }
    else {
      return <HighlightedCodeBlock language={language} source={source} />
    }
  },

  renderEditor: function({ layout, value, onChange }) {
    return (
      <textarea
        className={cx('editor')}
        value={value}
        onChange={onChange}
        style={layout}
      />
    )
  },
}
