import ResizeObserver from 'resize-observer-polyfill'
import ExecutionEnvironment from 'exenv'
import React, { Component, PropTypes } from 'react'
import ReactDOM from 'react-dom'
import ReactDOMServer from 'react-dom/server'
import frontMatter from 'front-matter'
import MDXC from 'mdxc'
import { transform } from 'babel-core'
import es2015 from 'babel-preset-es2015'
import defaultMDXBreadboardTheme from './defaultMDXBreadboardTheme'


function verifyThemePropTypes(props, propTypes) {
  // TODO.
}

function verifyMissingProps(props, propNames) {
  // TODO. 
}

function modesAreEqual(oldModes, newModes) {
  return (
    oldModes.source === newModes.source &&
    oldModes.component === newModes.component &&
    oldModes.transformed === newModes.transformed &&
    oldModes.console === newModes.console
  )
}


class ResponsiveDualModeController {
  constructor(env) {
    const {
      /**
       * Selects the secondary pane to display in the case that the user is
       * viewing the source pane on a small screen, and then the screen
       * expands to allow a second pane.
       */
      defaultSecondary='preview',

      /**
       * The default mode to display upon load when the screen only contains
       * space for a single pane.
       */
      defaultMode='source',

      /**
       * The maximum width for which only a single pane will be used.
       */
      maxSinglePaneWidth=999,
    } = env

    this.defaultSecondary = defaultSecondary
    this.defaultMode = defaultMode
    this.maxSinglePaneWidth = maxSinglePaneWidth
    this.modes = {}
    this.primary = defaultMode
    this.listeners = []
  }

  listen(callback) {
    this.listeners.push(callback)
  }
  unlisten(callback) {
    this.listeners.splice(this.listeners.indexOf(callback), 1)
  }

  environmentDidChange(newEnv) {
    if (newEnv.maxSinglePaneWidth !== this.maxSinglePaneWidth) {
      this.maxSinglePaneWidth = newEnv.maxSinglePaneWidth
      this._recalc()
    }
  }

  actions = {
    selectTransformed: () => {
      this.setMode('transformed')
    },
    selectComponent: () => {
      this.setMode('component')
    },
    selectConsole: () => {
      this.setMode('console')
    },
    selectSource: () => {
      this.setMode('source')
    },
  }

  setMode(newMode) {
    this.primary = newMode
    this._recalc()
  }

  setDimensions({ width }) {
    this.width = width
    this._recalc()
  }

  _recalc() {
    const oldModes = this.modes
    const newModes = {}

    if (this.width !== undefined && this.width <= this.maxSinglePaneWidth) {
      newModes[this.primary] = true
    }
    else {
      newModes['source'] = true
      newModes[this.primary === 'source' ? this.defaultSecondary : this.primary] = true
    }

    if (!modesAreEqual(newModes, oldModes)) {
      this.modes = newModes

      for (let listener of this.listeners) {
        listener(this.modes)
      }
    }
  }
}


const wrappedMDXC = new MDXC({
  linkify: true,
  typographer: true,
  highlight: false,
})
const unwrappedMDXC = new MDXC({
  linkify: true,
  typographer: true,
  highlight: false,
  unwrapped: true,
})
export class MDXBreadboard extends Component {
  static propTypes = {
    /**
     * The default mode to display upon load when the screen only contains
     * space for a single pane.
     */
    defaultMode: PropTypes.oneOf(['source', 'component', 'transformed', 'console']),

    /**
     * Selects the secondary pane to display in the case that the user is
     * viewing the source pane on a small screen, and then the screen
     * expands to allow a second pane.
     */
    defaultSecondary: PropTypes.oneOf(['component', 'transformed', 'console']).isRequired,

    /**
     * Configures whether the wrapper code will be displayed within the
     * transformed view.
     */
    defaultUnwrapped: PropTypes.bool,

    /**
     * Allows you to configure the factories of the rendered MDXDocument
     * object.
     */
    factories: PropTypes.object,

    /**
     * A function that renders the breadboard given a set of state and
     * event handlers.
     */
    theme: PropTypes.shape({
      renderBreadboard: PropTypes.func,
      renderCode: PropTypes.func,
      renderEditor: PropTypes.func,
    }),
  }

  static defaultProps = {
    defaultMode: 'source',
    defaultSecondary: 'component',
    defaultUnwrapped: false,
    theme: defaultMDXBreadboardTheme,
  }

  constructor(props) {
    super(props)

    this.modesController = new ResponsiveDualModeController({
      maxSinglePaneWidth: props.theme.maxSinglePaneWidth,
      defaultSecondary: props.defaultSecondary,
      defaultMode: props.defaultMode,
    })

    this.state = {
      componentProps: this.getComponentProps(this.props),
      unwrapped: this.props.defaultUnwrapped,
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.factories !== this.props.factories) {
      this.setState({ componentProps: this.getComponentProps(nextProps) })
    }
    if (nextProps.theme.maxSinglePaneWidth !== this.props.theme.maxSinglePaneWidth) {
      this.modesController.environmentDidChange({
          maxSinglePaneWidth: nextProps.theme.maxSinglePaneWidth,
      })
    }
  }

  getComponentProps(myProps) {
    return {
      factories: {
        ...myProps.factories,
        codeBlock: this.renderCodeBlock,
      }
    }
  }

  renderCodeBlock = (props, children) => {
    const language = props.className.replace(/^language-/, '')
    let breadboard

    if (language.slice(0, 3) === 'mdx') {
      const optionStrings = language.slice(4).replace(/^\{|\s|\}$/g, '').split(',')
      const options = {}
      for (let str of optionStrings) {
        if (str.indexOf('=') === -1) {
          options[str] = true
        }
        else {
          const parts = str.split('=')
          options[parts[0]] = parts[1]
        }
      }
      breadboard =
        <MDXBreadboard
          require={this.props.require}
          defaultSource={children}
          defaultUnwrapped={!!options.unwrapped}
          defaultMode={options.mode || 'source'}
          defaultSecondary={options.secondary || 'component'}
        />
    }

    return this.props.theme.renderCode({ language, breadboard, source: children })
  }

  renderTheme = (props) => {
    return this.props.theme.renderBreadboard(Object.assign({}, props, {
      unwrapped: this.state.unwrapped,
      onToggleWrapped: this.toggleWrapped,
    }))
  }

  render() {
    const { factories, defaultUnwrapped, ...other } = this.props

    return (
      <Breadboard
        {...other}
        modesController={this.modesController}
        componentProps={this.state.componentProps}
        theme={this.renderTheme}
        transform={this.transform}
        renderEditorElement={this.props.theme.renderEditor}
      />
    )
  }

  toggleWrapped = () => {
    this.setState({
      unwrapped: !this.state.unwrapped,
    })
  }

  transform = (source) => {
    const result = {}
    const data = frontMatter(source)
    const es6 = wrappedMDXC.render(data.body)
    const pretty = this.state.unwrapped ? unwrappedMDXC.render(data.body) : es6

    let runnableCode
    let error = null
    try {
      runnableCode = transform(es6, { presets: [es2015] }).code
    }
    catch (e) {
      error = e
    }

    return {
      pretty: pretty,
      ugly: runnableCode,
      error: null, 
    }
  }
}


function defaultBreadboardRequire(name) {
  if (name === 'react') {
    return React
  }
}

export default class Breadboard extends Component {
  static propTypes = {
    /**
     * The props that will be passed to the rendered component. Note that
     * `value` and `onChange` props will be passed through by default, unless
     * they're manually set to undefined.
     */
    componentProps: PropTypes.object,

    /**
     * A string containing the original source. Updates to the source will
     * be stored in component state. Updates to `defaultSource` will not be
     * reflected once the source has undergone any change.
     */
    defaultSource: PropTypes.string.isRequired,

    /**
     * Allows for fixing the breadboard's height.
     */
    height: PropTypes.number,

    /**
     * A Controller object that keeps track of the current visible modes.
     * Breadboard will only compile and/or execute code when it is required.
     */
    modesController: PropTypes.object.isRequired,

    /**
     * Allows you to configure the editor component. Accepts a function that
     * takes a `{ layout, value, onChange }`, and return an editor element.
     */
    renderEditorElement: PropTypes.func.isRequired,

    /**
     * The function that will be used to handle CommonJS `require()` calls
     * within the evaluated code. Defaults to a function that only provides
     * the `react` module.
     */
    require: PropTypes.func,

    /**
     * A function that renders the breadboard given a set of state and
     * event handlers.
     */
    theme: PropTypes.func.isRequired,

    /**
     * A function that transforms the source before evaluating it.
     *
     * Transform functions are often pretty heavy, so we don't include anything
     * but an ES2015 modules to CommonJS transform. You'll generally want to
     * add something like a Babel transform here.
     */
    transform: PropTypes.func,

    /**
     * Allows for fixing the breadboard's width.
     */
    width: PropTypes.number,
  }

  static defaultProps = {
    require: defaultBreadboardRequire,
    transform: function() { throw new Error("ERROR: Breadboard's default transform is not yet implemented") },
  }

  constructor(props) {
    super(props)

    const source = props.defaultSource.replace(/^\n|\n$/g, '')
    const { width, height } = props

    this.dimensions = { width, height }

    this.modesController = props.modesController
    this.modesController.setDimensions(this.dimensions)

    this.state = {
      consoleMessages: [],
      source: source,
      value: null,
      modes: this.modesController.modes,
    }

    Object.assign(this.state, this.compile(source, this.modesController.modes))

    this.fakeConsole = {
      log: this.logMessage.bind(this, 'log'),
      error: this.logMessage.bind(this, 'error'),
      warn: this.logMessage.bind(this, 'warn')
    }
  }

  componentDidMount() {
    this.modesController.listen(this.handleModesChange)
    this.manageDimensions(this.props)
    if (this.modesController.modes.component) {
      this.renderMountedComponent()
    }
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.modesController !== this.props.modesController) {
      console.warn('Breadboard does not currently support changes to the `modesController` prop!')
    }

    // The `transform` function may close over state, so we'll need to
    // recompile any time the props change.
    this.setState(this.compile(this.state.source, this.modesController.modes))

    this.manageDimensions(nextProps)  
  }
  componentDidUpdate(prevProps, prevState) {
    if (this.state.modes.component &&
        (!prevState.modes.component ||
         prevState.value !== this.state.value ||
         prevState.component !== this.state.component ||
         prevProps.componentProps !== this.props.componentProps)) {
      this.renderMountedComponent()
    }
  }
  componentWillUnmount() {
    if (this.resizeObserver) {
      this.destroyResizeObserver()
    }
  }

  manageDimensions(props) {
    const oldDimensions = this.dimensions
    let newDimensions

    if (props.width !== undefined && props.height !== undefined) {
      if (this.resizeObserver) {
        this.destroyResizeObserver()
      }
      newDimensions = props
    }
    else {
      if (!this.resizeObserver) {
        this.resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            this.handleResize({
              height: this.props.height === undefined ? entry.contentRect.height : this.props.height,
              width: this.props.width === undefined ? entry.contentRect.width : this.props.width,
            })
          }
        })
        this.resizeObserver.observe(this.rootElement)
      }

      const rect = this.rootElement.getBoundingClientRect()
      newDimensions = {
        height: props.height === undefined ? rect.height : props.height,
        width: props.width === undefined ? rect.width : props.width,
      }
    }

    if (newDimensions && (newDimensions.width !== oldDimensions.width || newDimensions.height !== oldDimensions.height)) {
      this.handleResize(newDimensions)
    }
  }
  destroyResizeObserver() {
    this.resizeObserver.disconnect()
    delete this.resizeObserver
  }

  handleResize = (dimensions) => {
    this.dimensions = dimensions
    this.modesController.setDimensions(dimensions)
  }

  handleModesChange = (modes) => {
    if (!modesAreEqual(modes, this.state.modes)) {
      this.setState({
        modes,
        ...this.compile(this.state.source, modes)
      })
    }
  }

  handleChangeSource = (e) => {
    const source = e.target.value
    if (source !== this.state.source) {
      this.setState({
        source,
        ...this.compile(source, this.state.modes)
      })
    }
  }

  handleChange = (e) => {
    this.setState({
      value: e.target.value,
    })
  }

  renderEditorElement = (themeableProps={}) => {
    if (process.env.NODE_ENV !== 'production') {
      // Editor components are complicated beings, and probably will feel the
      // same way about being "styled" as a dog feels about taking a bath.
      // 
      // If you want to theme your editor, you'll need to do so by passing in
      // an already themed editor. The only condition is that it accepts
      // layout styles via `style`, a `value` with the current source, and an
      // `onChange` callback that notifies us of a new value.
      verifyThemePropTypes(themeableProps, {
        layout: true,
      })
    }

    return this.props.renderEditorElement({
      layout: themeableProps.layout,
      value: this.state.source,
      onChange: this.handleChangeSource,
    })
  }

  renderMountElement = (themeableProps={}) => {
    if (process.env.NODE_ENV !== 'production') {
      verifyMissingProps(themeableProps, [
        'children',
        'style',
      ])
    }

    const { layout, ...other } = themeableProps

    return React.cloneElement(this.mountElement, {
      ...other,
      style: layout
    })
  }

  renderMountedComponent() {
    if (this.state.component) {
      ReactDOM.render(
        React.createElement(this.state.component, {
          value: this.state.value,
          onChange: this.handleChange,
          ...this.props.componentProps,
        }),
        this.refs.mount
      )
    }   
  }

  render() {
    // Generate the mount elememnt here to ensure that the ref attaches to
    // this component instance
    this.mountElement =
      ExecutionEnvironment.canUseDOM
       ? <div ref='mount' />
       : <div ref='mount' dangerouslySetInnerHTML={{__html: this.state.componentString}} />

    const rootElement = this.props.theme({
      consoleMessages: this.state.consoleMessages,
      transformedSource: this.state.transformedSource,
      transformError: this.transformError,
      executionError: this.executionError,

      renderEditorElement: this.renderEditorElement,
      renderMountElement: this.renderMountElement,

      modes: this.state.modes,
      modeActions: this.modesController.actions,
    })

    return React.cloneElement(rootElement, { ref: this.setRootElement })
  }

  setRootElement = (el) => {
    this.rootElement = el
  }

  compile(source, modes) {
    const run = modes.component || modes.console

    const result = {
      component: null,
      componentString: null,
      executionError: null,
      transformError: null,
      transformedSource: null,
    }
    
    if (!run && !modes.transformed) {
      return result
    }

    const { pretty, ugly, error } = this.props.transform(source)
    result.transformError = error
    result.transformedSource = pretty

    if (run && !!ugly) {
      try {
        var execute
        var exports = {}
        var module = { exports: exports }
        eval('execute = function execute(module, exports, require, console) { '+ugly+' }')
        execute(module, exports, this.props.require, this.fakeConsole)
        const tryComponent = exports.default
        result.componentString = ReactDOMServer.renderToString(React.createElement(tryComponent, {
          value: this.state.value,
          onChange: this.handleChange,
          ...this.props.componentProps,
        }))
        result.component = tryComponent
      } catch (err) {
        result.executionError = err
      }
    }

    return result
  }

  logMessage(type, ...args) {
    this.setState({
      consoleMessages: this.state.consoleMessages.concat({ type, args })
    })
  }
}
