import './SiteWrapper.scss'
import React, { PropTypes } from 'react'
import { Link } from 'sitepack-react'


function RedWhenActiveTheme({ factory, active, children }) {
  return factory({ style: { color: active ? 'red' : undefined } }, children)
}


SiteWrapper.propTypes = {
  page: PropTypes.object.isRequired,
  children: PropTypes.node,
}
export default function SiteWrapper({ page, children }) {
  return (
    <div className='SiteTheme'>
      <header className='SiteTheme-header'>
        <Link page='/content/index.page.js' theme={<RedWhenActiveTheme />} exact>Home</Link>
        <Link page='/content/about.md' theme={<RedWhenActiveTheme />}>About</Link>
      </header>
      <main className='SiteTheme-main'>
        {
          /* `children` will be `undefined` on 404 */
          children || '404'
        }
      </main>
    </div>
  )
}
