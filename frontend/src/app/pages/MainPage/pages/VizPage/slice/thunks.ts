/**
 * Datart
 *
 * Copyright 2021
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { ChartDataRequestBuilder } from 'app/pages/ChartWorkbenchPage/models/ChartDataRequestBuilder';
import {
  Dashboard,
  DataChart,
} from 'app/pages/DashBoardPage/pages/Board/slice/types';
import { selectOrgId } from 'app/pages/MainPage/slice/selectors';
import { getLoggedInUserPermissions } from 'app/pages/MainPage/slice/thunks';
import { StoryBoard } from 'app/pages/StoryBoardPage/slice/types';
import { ChartDTO } from 'app/types/ChartDTO';
import { convertToChartDTO } from 'app/utils/ChartDtoHelper';
import { filterSqlOperatorName } from 'app/utils/internalChartHelper';
import { RootState } from 'types';
import { request2 } from 'utils/request';
import { vizActions } from '.';
import { selectSelectedTab, selectVizs } from './selectors';
import {
  AddStoryboardParams,
  AddVizParams,
  ChartPreview,
  DeleteStoryboardParams,
  DeleteVizParams,
  EditFolderParams,
  EditStoryboardParams,
  FilterSearchParams,
  Folder,
  FolderViewModel,
  PublishVizParams,
  SaveAsDashboardParams,
  Storyboard,
  StoryboardViewModel,
  UnarchiveVizParams,
  VizState,
} from './types';

export const getFolders = createAsyncThunk<Folder[], string>(
  'viz/getFolders',
  async orgId => {
    const { data } = await request2<Folder[]>(`/viz/folders?orgId=${orgId}`);
    return data;
  },
);

export const getStoryboards = createAsyncThunk<Storyboard[], string>(
  'viz/getStoryboards',
  async orgId => {
    const { data } = await request2<Storyboard[]>(
      `viz/storyboards?orgId=${orgId}`,
    );
    return data;
  },
);

export const getArchivedDatacharts = createAsyncThunk<DataChart[], string>(
  'viz/getArchivedDatacharts',
  async orgId => {
    const { data } = await request2<DataChart[]>(
      `/viz/archived/datachart/${orgId}`,
    );
    return data;
  },
);

export const getArchivedDashboards = createAsyncThunk<Dashboard[], string>(
  'viz/getArchivedDashboards',
  async orgId => {
    const { data } = await request2<Dashboard[]>(
      `/viz/archived/dashboard/${orgId}`,
    );
    return data;
  },
);

export const getArchivedStoryboards = createAsyncThunk<StoryBoard[], string>(
  'viz/getArchivedStoryboards',
  async orgId => {
    const { data } = await request2<StoryBoard[]>(
      `/viz/archived/storyboard/${orgId}`,
    );
    return data;
  },
);

export const addStoryboard = createAsyncThunk<
  Storyboard,
  AddStoryboardParams,
  { state: RootState }
>(
  'viz/addStoryboard',
  async ({ storyboard, resolve }, { getState, dispatch, rejectWithValue }) => {
    const { data } = await request2<Storyboard>({
      url: `/viz/storyboards`,
      method: 'POST',
      data: storyboard,
    });

    // FIXME 拥有Read权限等级的扁平结构资源新增后需要更新权限字典；后续如改造为目录结构则删除该逻辑
    const orgId = selectOrgId(getState());
    await dispatch(getLoggedInUserPermissions(orgId));

    resolve();
    return data;
  },
);

export const editStoryboard = createAsyncThunk<
  StoryboardViewModel,
  EditStoryboardParams
>('viz/editStoryboard', async ({ storyboard, resolve }) => {
  await request2<boolean>({
    url: `/viz/storyboards/${storyboard.id}`,
    method: 'PUT',
    data: storyboard,
  });
  resolve();
  return storyboard;
});

export const deleteStoryboard = createAsyncThunk<
  boolean,
  DeleteStoryboardParams
>('viz/deleteStoryboard', async ({ id, archive, resolve }) => {
  const { data } = await request2<boolean>({
    url: `/viz/storyboards/${id}`,
    method: 'DELETE',
    params: { archive },
  });
  resolve();
  return data;
});

export const addViz = createAsyncThunk<Folder, AddVizParams>(
  'viz/addViz',
  async ({ viz, type }) => {
    const { data } = await request2<Folder>({
      url: `/viz/${type.toLowerCase()}s`,
      method: 'POST',
      data: viz,
    });
    return data;
  },
);

export const editFolder = createAsyncThunk<
  FolderViewModel,
  EditFolderParams,
  { state: RootState }
>('viz/editFolder', async ({ folder, resolve }, { getState }) => {
  const folders = selectVizs(getState());
  const origin = folders.find(({ id }) => id === folder.id)!;
  const merged = { ...origin, ...folder };
  await request2<boolean>({
    url: `/viz/folders/${folder.id}`,
    method: 'PUT',
    data: merged,
  });
  resolve();
  return merged;
});

export const unarchiveViz = createAsyncThunk<void, UnarchiveVizParams>(
  'viz/unarchiveViz',
  async (
    { params: { id, name, vizType, parentId, index }, resolve },
    thunkAPI,
  ) => {
    await request2<boolean>({
      url: `/viz/unarchive/${id}`,
      method: 'PUT',
      params: { vizType, newName: name, parentId, index },
    });
    resolve();
  },
);

export const deleteViz = createAsyncThunk<boolean, DeleteVizParams>(
  'viz/deleteViz',
  async ({ params: { id, archive }, type, resolve }) => {
    const { data } = await request2<boolean>({
      url: `/viz/${type.toLowerCase()}s/${id}`,
      method: 'DELETE',
      params: { archive },
    });
    resolve();
    return data;
  },
);

export const publishViz = createAsyncThunk<null, PublishVizParams>(
  'viz/publishViz',
  async ({ id, vizType, publish, resolve }) => {
    await request2<boolean>({
      url: `/viz/${publish ? 'publish' : 'unpublish'}/${id}`,
      method: 'PUT',
      params: { vizType },
    });
    resolve();
    return null;
  },
);

export const removeTab = createAsyncThunk<
  null,
  { id: string; resolve: (selectedTab: string) => void },
  { state: RootState }
>('viz/removeTab', async ({ id, resolve }, { getState, dispatch }) => {
  dispatch(vizActions.closeTab(id));
  const selectedTab = selectSelectedTab(getState());
  resolve(selectedTab ? selectedTab.id : '');
  return null;
});

export const initChartPreviewData = createAsyncThunk<
  { backendChartId: string },
  {
    backendChartId: string;
    orgId: string;
    filterSearchParams?: FilterSearchParams;
  }
>(
  'viz/initChartPreviewData',
  async ({ backendChartId, filterSearchParams }, thunkAPI) => {
    await thunkAPI.dispatch(
      fetchVizChartAction({ backendChartId, filterSearchParams }),
    );
    if (backendChartId) {
      await thunkAPI.dispatch(
        fetchDataSetByPreviewChartAction({
          backendChartId,
        }),
      );
    }
    return { backendChartId };
  },
);

export const fetchVizChartAction = createAsyncThunk(
  'viz/fetchVizChartAction',
  async (arg: { backendChartId; filterSearchParams?: FilterSearchParams }) => {
    const response = await request2<
      Omit<ChartDTO, 'config'> & { config: string }
    >({
      method: 'GET',
      url: `viz/datacharts/${arg.backendChartId}`,
    });
    return {
      data: convertToChartDTO(response?.data),
      filterSearchParams: arg.filterSearchParams,
    };
  },
);

export const fetchDataSetByPreviewChartAction = createAsyncThunk(
  'viz/fetchDataSetByPreviewChartAction',
  async (
    arg: {
      backendChartId: string;
      pageInfo?;
      sorter?: { column: string; operator: string; aggOperator?: string };
    },
    thunkAPI,
  ) => {
    const vizState = (thunkAPI.getState() as RootState)?.viz as VizState;
    const currentChartPreview = vizState?.chartPreviews?.find(
      c => c.backendChartId === arg.backendChartId,
    );
    const builder = new ChartDataRequestBuilder(
      {
        id: currentChartPreview?.backendChart?.viewId,
        computedFields:
          currentChartPreview?.backendChart?.config?.computedFields || [],
        view: currentChartPreview?.backendChart?.view,
      } as any,
      currentChartPreview?.chartConfig?.datas,
      currentChartPreview?.chartConfig?.settings,
      arg.pageInfo,
      false,
      currentChartPreview?.backendChart?.config?.aggregation,
    );
    const data = builder
      .addExtraSorters(arg?.sorter ? [arg?.sorter as any] : [])
      .build();

    const response = await request2({
      method: 'POST',
      url: `data-provider/execute`,
      data,
    });
    return {
      backendChartId: currentChartPreview?.backendChartId,
      data: filterSqlOperatorName(data, response.data) || [],
    };
  },
);

export const updateFilterAndFetchDataset = createAsyncThunk(
  'viz/updateFilterAndFetchDataset',
  async (
    arg: { backendChartId: string; chartPreview?: ChartPreview; payload },
    thunkAPI,
  ) => {
    await thunkAPI.dispatch(
      vizActions.updateChartPreviewFilter({
        backendChartId: arg.backendChartId,
        payload: arg.payload,
      }),
    );
    await thunkAPI.dispatch(
      fetchDataSetByPreviewChartAction({
        backendChartId: arg.backendChartId,
      }),
    );

    return {
      backendChartId: arg.backendChartId,
    };
  },
);

export const saveAsDashboard = createAsyncThunk<Folder, SaveAsDashboardParams>(
  'viz/saveAsDashboard',
  async ({ viz, dashboardId }) => {
    const { data } = await request2<Folder>({
      url: `/viz/dashboards/${dashboardId}/copy`,
      method: 'PUT',
      data: viz,
    });
    return data;
  },
);
