import React, { Component, PropTypes } from 'react'
import { PageContentLoader } from 'sitepack-react'
import { MDXBreadboard } from './Breadboard'
import fullscreenMDXBreadboardTheme from './fullscreenMDXBreadboardTheme'


function breadboardRequire(name) {
  if (name === 'react') {
    return React
  }
  else if (name === 'mdx-breadboard') {
    return MDXBreadboard
  }
}



export default class Application extends Component {
  static propTypes = {
    history: PropTypes.object.isRequired,
    site: PropTypes.object.isRequired,
  }

  renderPageContent = ({ errorMessage, isLoading, content }) =>
    <div>
      { errorMessage &&
        <div style={{color: 'red'}}>{errorMessage}</div>
      }
      <MDXBreadboard
        defaultSource={content}
        theme={fullscreenMDXBreadboardTheme}
        require={breadboardRequire}
      />
    </div>

  render() {
    const { page, hash } = this.props

    /**
     * A Sitepack Page will not always have its content available immediately.
     * 
     * In order to reduce the bundle size of your application, Sitepack will
     * sometimes replace the `content` property of a Page object with a
     * function that returns a Promise to your content.
     *
     * While it is possible to handle these promises yourself, the
     * <PageContentLoader /> element from the `sitepack-react` package is the
     * recommended way of accessing your Page content in a React app.
     */
    return (
      <PageContentLoader
        page={this.props.site.rootPage}
        render={this.renderPageContent}
      />
    )
  }
}
