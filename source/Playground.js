import React, { Component, PropTypes } from 'react'
import { render } from 'react-dom'
import ReactDOMServer from 'react-dom/server'
import { PrismCode } from 'react-prism'
import frontMatter from 'front-matter'
import MDXC from 'mdxc'
import { transform } from 'babel-core'
import es2015 from 'babel-preset-es2015'

const md = new MDXC({
  linkify: true,
  typographer: true,
})
const mdCommonJS = new MDXC({
  linkify: true,
  typographer: true,
  commonJS: true
})

export default class Playground extends Component {
  static propTypes = {
    children: PropTypes.string.isRequired,
  }

  onChange = (e) => {
    this.setState({
      value: e.target.value,
    })
  }

  toggleLive = () => {
    this.setState({
      type: this.state.type === 'live' ? 'source' : 'live',
    })
  }

  constructor(props) {
    super(props)

    let source = props.children
    if (source[0] === '\n') source = source.slice(1)
    this.state = {
      source,
      value: '',
      type: 'live',
      ...this.compileCode(source)
    }
  }

  handleChangeSource = (e) => {
    const source = e.target.value
    const updates = { source }
    if (source !== this.state.source) {
      Object.assign(updates, this.compileCode(source))
    }
    this.setState(updates)
  }

  render() {
    const data = frontMatter(this.state.source)
    const compiled = md.render(data.body)

    return (
      <div className='Playground'>
        <nav onClick={this.toggleLive}>
          <span className={this.state.type === 'live' ? 'active' : ''}>Live</span>
          <span className={this.state.type === 'source' ? 'active' : ''}>Source</span>
        </nav>
        <textarea value={this.state.source} onChange={this.handleChangeSource} />
        <div className='Playground-mount' ref='mount' />
        { this.state.type == 'source' && <pre><PrismCode className="language-javascript">{compiled}</PrismCode></pre> }
      </div>
    )
  }

  compileCode(source) {
    const data = frontMatter(source)

    let component

    try {
      const compiledCode = transform(mdCommonJS.render(data.body), { presets: [es2015] }).code
      var execute
      var module = {}
      function require(name) {
        if (name === 'react') {
          return React
        }
      }
      eval('execute = function execute(module, require) { '+compiledCode+' }').call(null, module, require)
      execute(module, require)
      const tryComponent = module.exports
      ReactDOMServer.renderToString(React.createElement(tryComponent))
      component = tryComponent
    } catch (err) {
      console.error(err)
      this._setTimeout(() => {
        this.setState({ error: err.toString() })
      }, 500);
    }

    const updates = {
      compiled: md.render(data.body),
    }
    if (component) {
      updates.component = component
      updates.error = null
    }

    return updates
  }

  executeCode() {
    const mountNode = this.refs.mount

    if (this.state.component) {
      render(
        React.createElement(this.state.component, { value: this.state.value, onChange: this.onChange }),
        mountNode
      )
    }   
  }

  componentDidMount = () => {
    this.executeCode()
  }

  componentDidUpdate = (prevProps, prevState) => {
    clearTimeout(this.timeoutID)
    if (prevState.value !== this.state.value || prevState.component !== this.state.component)
    this.executeCode()
  }

  _setTimeout = (...args) => {
    clearTimeout(this.timeoutID)
    this.timeoutID = setTimeout.apply(null, args)
  }
}
