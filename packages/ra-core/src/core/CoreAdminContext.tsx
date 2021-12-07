import * as React from 'react';
import { ComponentType, useContext, useMemo, useState } from 'react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { Provider, ReactReduxContext } from 'react-redux';
import { createHashHistory, History } from 'history';
import { HistoryRouter } from './HistoryRouter';

import { AuthContext, convertLegacyAuthProvider } from '../auth';
import {
    DataProviderContext,
    convertLegacyDataProvider,
} from '../dataProvider';
import createAdminStore from './createAdminStore';
import TranslationProvider from '../i18n/TranslationProvider';
import {
    AuthProvider,
    LegacyAuthProvider,
    I18nProvider,
    DataProvider,
    AdminChildren,
    DashboardComponent,
    LegacyDataProvider,
    InitialState,
} from '../types';

export type ChildrenFunction = () => ComponentType[];

export interface AdminContextProps {
    authProvider?: AuthProvider | LegacyAuthProvider;
    children?: AdminChildren;
    customReducers?: object;
    dashboard?: DashboardComponent;
    dataProvider: DataProvider | LegacyDataProvider;
    queryClient?: QueryClient;
    history?: History;
    i18nProvider?: I18nProvider;
    initialState?: InitialState;
    theme?: object;
}

const CoreAdminContext = (props: AdminContextProps) => {
    const {
        authProvider,
        dataProvider,
        i18nProvider,
        children,
        history,
        customReducers,
        queryClient,
        initialState,
    } = props;
    const needsNewRedux = !useContext(ReactReduxContext);

    if (!dataProvider) {
        throw new Error(`Missing dataProvider prop.
React-admin requires a valid dataProvider function to work.`);
    }

    const finalQueryClient = useMemo(() => queryClient || new QueryClient(), [
        queryClient,
    ]);

    const finalAuthProvider = useMemo(
        () =>
            authProvider instanceof Function
                ? convertLegacyAuthProvider(authProvider)
                : authProvider,
        [authProvider]
    );

    const finalDataProvider = useMemo(
        () =>
            dataProvider instanceof Function
                ? convertLegacyDataProvider(dataProvider)
                : dataProvider,
        [dataProvider]
    );

    const finalHistory = useMemo(() => history || createHashHistory(), [
        history,
    ]);

    const renderCore = () => {
        return (
            <AuthContext.Provider value={finalAuthProvider}>
                <DataProviderContext.Provider value={finalDataProvider}>
                    <QueryClientProvider client={finalQueryClient}>
                        <TranslationProvider i18nProvider={i18nProvider}>
                            <HistoryRouter history={finalHistory}>
                                {children}
                            </HistoryRouter>
                        </TranslationProvider>
                    </QueryClientProvider>
                </DataProviderContext.Provider>
            </AuthContext.Provider>
        );
    };

    const [store] = useState(() =>
        needsNewRedux
            ? createAdminStore({
                  customReducers,
                  initialState,
              })
            : undefined
    );

    if (needsNewRedux) {
        return <Provider store={store}>{renderCore()}</Provider>;
    } else {
        return renderCore();
    }
};

export default CoreAdminContext;