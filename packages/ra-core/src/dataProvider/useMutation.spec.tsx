import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import expect from 'expect';
import { Provider } from 'react-redux';

import { createAdminStore, CoreAdminContext, Resource } from '../core';
import Mutation from './Mutation';
import { testDataProvider } from '../dataProvider';

describe('useMutation', () => {
    const initialState = {
        admin: {
            resources: { foo: {} },
        },
    };
    const store = createAdminStore({ initialState });

    it('should pass a callback to trigger the mutation', () => {
        let callback = null;
        render(
            <CoreAdminContext dataProvider={testDataProvider()}>
                <Mutation type="foo" resource="bar">
                    {mutate => {
                        callback = mutate;
                        return <div data-testid="test">Hello</div>;
                    }}
                </Mutation>
            </CoreAdminContext>
        );
        expect(callback).toBeInstanceOf(Function);
    });

    it('should dispatch a fetch action when the mutation callback is triggered', () => {
        const dataProvider = {
            mytype: jest.fn(() => Promise.resolve({ data: { foo: 'bar' } })),
        };

        const myPayload = {};
        const dispatch = jest.spyOn(store, 'dispatch');
        render(
            <Provider store={store}>
                <CoreAdminContext dataProvider={dataProvider}>
                    <Mutation
                        type="mytype"
                        resource="myresource"
                        payload={myPayload}
                    >
                        {mutate => <button onClick={mutate}>Hello</button>}
                    </Mutation>
                </CoreAdminContext>
            </Provider>
        );
        fireEvent.click(screen.getByText('Hello'));
        const action = dispatch.mock.calls[0][0];
        expect(action.type).toEqual('CUSTOM_FETCH');
        expect(action.payload).toEqual(myPayload);
        expect(action.meta.resource).toEqual('myresource');
        dispatch.mockRestore();
    });

    it('should use callTimePayload and callTimeOptions', () => {
        const dataProvider = {
            mytype: jest.fn(() => Promise.resolve({ data: { foo: 'bar' } })),
        };

        const myPayload = { foo: 1 };
        const dispatch = jest.spyOn(store, 'dispatch');
        render(
            <Provider store={store}>
                <CoreAdminContext dataProvider={dataProvider}>
                    <Mutation
                        type="mytype"
                        resource="myresource"
                        payload={myPayload}
                    >
                        {mutate => (
                            <button
                                onClick={e =>
                                    mutate(
                                        { payload: { bar: 2 } },
                                        { meta: 'baz' }
                                    )
                                }
                            >
                                Hello
                            </button>
                        )}
                    </Mutation>
                </CoreAdminContext>
            </Provider>
        );
        fireEvent.click(screen.getByText('Hello'));
        const action = dispatch.mock.calls[0][0];
        expect(action.payload).toEqual({ foo: 1, bar: 2 });
        expect(action.meta.meta).toEqual('baz');
        dispatch.mockRestore();
    });

    it('should use callTimeQuery over definition query', () => {
        const dataProvider = {
            mytype: jest.fn(() => Promise.resolve({ data: { foo: 'bar' } })),
            callTimeType: jest.fn(() =>
                Promise.resolve({ data: { foo: 'bar' } })
            ),
        };

        const myPayload = { foo: 1 };
        const dispatch = jest.spyOn(store, 'dispatch');
        render(
            <Provider store={store}>
                <CoreAdminContext dataProvider={dataProvider}>
                    <Mutation
                        type="mytype"
                        resource="myresource"
                        payload={myPayload}
                    >
                        {mutate => (
                            <button
                                onClick={e =>
                                    mutate(
                                        {
                                            resource: 'callTimeResource',
                                            type: 'callTimeType',
                                            payload: { bar: 2 },
                                        },
                                        { meta: 'baz' }
                                    )
                                }
                            >
                                Hello
                            </button>
                        )}
                    </Mutation>
                </CoreAdminContext>
            </Provider>
        );
        fireEvent.click(screen.getByText('Hello'));
        const action = dispatch.mock.calls[0][0];
        expect(action.payload).toEqual({ foo: 1, bar: 2 });
        expect(action.meta.resource).toEqual('callTimeResource');
        expect(action.meta.meta).toEqual('baz');
        expect(dataProvider.mytype).not.toHaveBeenCalled();
        expect(dataProvider.callTimeType).toHaveBeenCalled();
        dispatch.mockRestore();
    });

    it('should update the loading state when the mutation callback is triggered', () => {
        const dataProvider = {
            mytype: jest.fn(() => Promise.resolve({ data: { foo: 'bar' } })),
        };

        const myPayload = {};
        render(
            <CoreAdminContext dataProvider={dataProvider}>
                <Mutation
                    type="mytype"
                    resource="myresource"
                    payload={myPayload}
                >
                    {(mutate, { loading }) => (
                        <button
                            className={loading ? 'loading' : 'idle'}
                            onClick={mutate}
                        >
                            Hello
                        </button>
                    )}
                </Mutation>
            </CoreAdminContext>
        );
        expect(screen.getByText('Hello').className).toEqual('idle');
        fireEvent.click(screen.getByText('Hello'));
        expect(screen.getByText('Hello').className).toEqual('loading');
    });

    it('should update the data state after a success response', async () => {
        const dataProvider = {
            mytype: jest.fn(() => Promise.resolve({ data: { foo: 'bar' } })),
        };

        const Foo = () => (
            <Mutation type="mytype" resource="foo">
                {(mutate, { data }) => (
                    <button data-testid="test" onClick={mutate}>
                        {data ? data.foo : 'no data'}
                    </button>
                )}
            </Mutation>
        );
        render(
            <CoreAdminContext
                dataProvider={dataProvider}
                initialState={initialState}
            >
                <Resource name="foo" list={Foo} />
            </CoreAdminContext>
        );
        const testElement = screen.getByTestId('test');
        expect(testElement.textContent).toBe('no data');
        fireEvent.click(testElement);
        await waitFor(() => {
            expect(testElement.textContent).toEqual('bar');
        });
    });

    it('should update the error state after an error response', async () => {
        jest.spyOn(console, 'error').mockImplementationOnce(() => {});
        const dataProvider = {
            mytype: jest.fn(() =>
                Promise.reject({ message: 'provider error' })
            ),
        };
        const Foo = () => (
            <Mutation type="mytype" resource="foo">
                {(mutate, { error }) => (
                    <button data-testid="test" onClick={mutate}>
                        {error ? error.message : 'no data'}
                    </button>
                )}
            </Mutation>
        );
        render(
            <CoreAdminContext
                dataProvider={dataProvider}
                initialState={initialState}
            >
                <Resource name="foo" list={Foo} />
            </CoreAdminContext>
        );
        const testElement = screen.getByTestId('test');
        expect(testElement.textContent).toBe('no data');
        fireEvent.click(testElement);
        await waitFor(() => {
            expect(testElement.textContent).toEqual('provider error');
        });
    });

    it('should allow custom dataProvider methods without resource', () => {
        const dataProvider = {
            mytype: jest.fn(() => Promise.resolve({ data: { foo: 'bar' } })),
        };

        const myPayload = {};
        const dispatch = jest.spyOn(store, 'dispatch');
        render(
            <Provider store={store}>
                <CoreAdminContext dataProvider={dataProvider}>
                    <Mutation type="mytype" payload={myPayload}>
                        {mutate => <button onClick={mutate}>Hello</button>}
                    </Mutation>
                </CoreAdminContext>
            </Provider>
        );
        fireEvent.click(screen.getByText('Hello'));
        const action = dispatch.mock.calls[0][0];
        expect(action.type).toEqual('CUSTOM_FETCH');
        expect(action.meta.resource).toBeUndefined();
        expect(dataProvider.mytype).toHaveBeenCalledWith(myPayload);
        dispatch.mockRestore();
    });

    it('should return a promise to dispatch a fetch action when returnPromise option is set and the mutation callback is triggered', async () => {
        const dataProvider = {
            mytype: jest.fn(() => Promise.resolve({ data: { foo: 'bar' } })),
        };

        let promise = null;
        const myPayload = {};
        const dispatch = jest.spyOn(store, 'dispatch');
        render(
            <Provider store={store}>
                <CoreAdminContext dataProvider={dataProvider}>
                    <Mutation
                        type="mytype"
                        resource="myresource"
                        payload={myPayload}
                        options={{ returnPromise: true }}
                    >
                        {(mutate, { loading }) => (
                            <button
                                className={loading ? 'loading' : 'idle'}
                                onClick={() => (promise = mutate())}
                            >
                                Hello
                            </button>
                        )}
                    </Mutation>
                </CoreAdminContext>
            </Provider>
        );
        const buttonElement = screen.getByText('Hello');
        fireEvent.click(buttonElement);
        const action = dispatch.mock.calls[0][0];
        expect(action.type).toEqual('CUSTOM_FETCH');
        expect(action.payload).toEqual(myPayload);
        expect(action.meta.resource).toEqual('myresource');
        await waitFor(() => {
            expect(buttonElement.className).toEqual('idle');
        });
        expect(promise).toBeInstanceOf(Promise);
        const result = await promise;
        expect(result).toMatchObject({ data: { foo: 'bar' } });
        dispatch.mockRestore();
    });
});