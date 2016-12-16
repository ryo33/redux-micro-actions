const mocha = require('mocha')
const { expect } = require('chai')

const { createStore, applyMiddleware, compose } = require('redux')

const {
  micro,
  isMicro,
  allowMicro,
  denyMicro
} = require('./index')

const META_KEY = '@@redux-micro-actions/micro'

describe('micro', function() {
  it('should work with actions which have meta key', function() {
    const actionCreator = () => (
      {type: 'TEST', meta: { dummy: "dummy" }}
    )
    expect(micro(actionCreator)()).to.eql({
      type: 'TEST',
      meta: {
        dummy: "dummy",
        [META_KEY]: true
      }
    })
  })

  it('should work with actions which don\'t have meta key', function() {
    const actionCreator = (a, b, c) => (
      {type: 'TEST', a, b, c}
    )
    expect(micro(actionCreator)(1, 2, 3)).to.eql({
      type: 'TEST', a: 1, b: 2, c: 3,
      meta: {
        [META_KEY]: true
      }
    })
  })
})

describe('isMicro', function() {
  it('should work correctly', function() {
    const microAction1 = {
      type: 'TEST',
      meta: {
        [META_KEY]: true
      }
    }
    const microAction2 = {
      type: 'TEST',
      meta: {
        dummy: "dummy",
        [META_KEY]: true
      }
    }
    const notMicroAction1 = {
      type: 'TEST'
    }
    const notMicroAction2 = {
      type: 'TEST',
      meta: {dummy: "dummy"}
    }
    const notMicroAction3 = {
      type: 'TEST',
      meta: {
        [META_KEY]: false
      }
    }
    expect(isMicro(microAction1)).to.be.true
    expect(isMicro(microAction2)).to.be.true
    expect(isMicro(notMicroAction1)).to.be.false
    expect(isMicro(notMicroAction2)).to.be.false
    expect(isMicro(notMicroAction3)).to.be.false
  })
})

describe('allowMicro', function() {
  it('should work correctly', function() {
    const normalMiddleware = store => next => action => {
      store.dispatch(action)
    }
    const allowedMiddleware = allowMicro(normalMiddleware)
    let lastAction;
    const store = {
      dispatch: (action) => lastAction = action
    }
    const actionCreator = () => ({type: 'TEST'})
    const normalAction = () => actionCreator()
    const microAction = () => micro(actionCreator)()

    normalMiddleware(store)(() => {})(normalAction())
    expect(lastAction).to.eql(normalAction())

    lastAction = null

    normalMiddleware(store)(() => {})(microAction())
    expect(lastAction).to.eql(microAction())

    lastAction = null

    allowedMiddleware(store)(() => {})(normalAction())
    expect(lastAction).to.eql(normalAction())

    lastAction = null

    allowedMiddleware(store)(() => {})(microAction())
    expect(lastAction).to.eql({
      type: 'TEST',
      meta: {
        [META_KEY]: false
      }
    })
  })
})

describe('denyMicro', function() {
  it('should work correctly', function() {
    const reducer = (state = 0) => state + 1
    const actionCreator = () => ({type: 'TEST'})
    const normalAction = () => actionCreator()
    const microAction = () => micro(actionCreator)()
    const NORMAL_FROM_ALLOWED = 'NORMAL_FROM_ALLOWED' // dispatch a normal action from the allowed middleware
    const NORMAL_FROM_NOT_ALLOWED = 'NORMAL_FROM_NOT_ALLOWED' // dispatch a normal action from the allowed middleware
    const MICRO_FROM_ALLOWED = 'MICRO_FROM_ALLOWED' // dispatch a micro action from the allowed middleware
    const MICRO_FROM_NOT_ALLOWED = 'MICRO_FROM_NOT_ALLOWED' // dispatch a micro action from the not allowed middleware

    const allowedMiddleware = store => next => action => {
      if (action.type == NORMAL_FROM_ALLOWED) {
        store.dispatch(normalAction())
      } else if (action.type == MICRO_FROM_ALLOWED) {
        store.dispatch(microAction())
      }
      next(action)
    }
    const notAllowedMiddleware = store => next => action => {
      if (action.type == NORMAL_FROM_NOT_ALLOWED) {
        store.dispatch(normalAction())
      } else if (action.type == MICRO_FROM_NOT_ALLOWED) {
        store.dispatch(microAction())
      }
      next(action)
    }
    const store = createStore(
      reducer,
      compose(
        applyMiddleware(
          notAllowedMiddleware,
          allowMicro(allowedMiddleware)
        ),
        denyMicro()
      )
    )

    expect(store.getState()).to.equal(1)

    store.dispatch({type: NORMAL_FROM_ALLOWED})
    expect(store.getState()).to.equal(1 + 2)

    store.dispatch({type: NORMAL_FROM_NOT_ALLOWED})
    expect(store.getState()).to.equal(1 + 2 * 2)

    store.dispatch({type: MICRO_FROM_ALLOWED})
    expect(store.getState()).to.equal(1 + 2 * 3)

    const fn = () => store.dispatch({type: MICRO_FROM_NOT_ALLOWED})
    expect(fn).to.throw(Error, '\'TEST\' is a micro action.')
    expect(store.getState()).to.equal(1 + 2 * 3)
  })
})
