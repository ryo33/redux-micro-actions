const META_KEY = '@@redux-micro-actions/micro'

const micro = actionCreator => (...args) => {
  let action = actionCreator(...args)
  if (action.meta) {
    action.meta[META_KEY] = true
  } else {
    action.meta = {[META_KEY]: true}
  }
  return action
}

const unmicro = action => {
  if (action.meta) {
    action.meta[META_KEY] = false
    return action
  } else {
    return action
  }
}

const isMicro = action => {
  return !!(action.meta && action.meta[META_KEY])
}

const allowMicro = middleware => store => next => action => {
  const allowedStore = Object.assign({}, store, {
    dispatch: (action) => store.dispatch(unmicro(action))
  })
  middleware(allowedStore)(next)(action)
}

const defaultCallback = action => {
  throw Error(`'${action.type}' is a micro action.`)
}

const denyMicro = (callback = defaultCallback) => next => (reducer, state, enhancer) => {
  const store = next(reducer, state, enhancer)
  const allowedStore = Object.assign({}, store, {
    dispatch: action => {
      if (isMicro(action)) {
        callback(action)
      }
      store.dispatch(action)
    }
  })
  return allowedStore
}

module.exports = {
  micro, isMicro, allowMicro, denyMicro
}
