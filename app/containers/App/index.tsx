import { hot } from 'react-hot-loader/root';
import 'tslib';
import React, { Component } from 'react';
import CssBaseline from '@material-ui/core/CssBaseline';
import {
  MuiThemeProvider,
  createMuiTheme,
  withStyles
} from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { log } from '../../utils/log';
import { IS_PROD } from '../../constants/env';
import { theme, styles } from './styles';
import Alerts from '../Alerts';
import Titlebar from './components/Titlebar';
import ErrorBoundary from '../ErrorBoundary';
import Routes from '../../routing';
import { bootLoader } from '../../utils/bootHelper';
import { settingsStorage } from '../../utils/storageHelper';
import SettingsDialog from '../Settings';
import { withReducer } from '../../store/reducers/withReducer';
import reducers from './reducers';
import { copyJsonFileToSettings, freshInstall } from '../Settings/actions';
import { analytics } from '../../utils/analyticsHelper';
import { isConnected } from '../../utils/isOnline';
import { AppProps } from './types';
import { action } from 'typesafe-actions';
import { GetState } from '../../types/store';

const appTheme = createMuiTheme(theme());

class App extends Component<AppProps> {
  private allowWritingJsonToSettings = false;

  public componentWillMount() {
    try {
      this.setFreshInstall();
      if (this.allowWritingJsonToSettings) {
        this.writeJsonToSettings();
      }

      this.runAnalytics();
    } catch (e) {
      log.error(e, `App -> componentWillMount`);
    }
  }

  public componentDidMount() {
    try {
      bootLoader.cleanRotationFiles();
    } catch (e) {
      log.error(e, `App -> componentDidMount`);
    }
  }

  private setFreshInstall(): void {
    try {
      const { actionCreateFreshInstall } = this.props;
      const isFreshInstallSettings: any = settingsStorage.getItems([
        'freshInstall'
      ]);
      let isFreshInstall = 0;

      switch (isFreshInstallSettings.freshInstall) {
        case undefined:
        case null:
          // app was just installed
          isFreshInstall = 1;
          break;
        case 1:
          // second boot after installation
          isFreshInstall = 0;
          break;
        case -1:
          // isFreshInstall was reset
          isFreshInstall = 1;
          break;
        case 0:
        default:
          // more than 2 boot ups have occured
          isFreshInstall = 0;
          this.allowWritingJsonToSettings = true;

          return;
      }

      actionCreateFreshInstall({ isFreshInstall });
    } catch (e) {
      log.error(e, `App -> setFreshInstall`);
    }
  }

  private writeJsonToSettings() {
    try {
      const { actionCreateCopyJsonFileToSettings } = this.props;
      const settingsFromStorage = settingsStorage.getAll();

      actionCreateCopyJsonFileToSettings({ ...settingsFromStorage });
    } catch (e) {
      log.error(e, `App -> writeJsonToSettings`);
    }
  }

  private runAnalytics() {
    const isAnalyticsEnabledSettings: any = settingsStorage.getItems([
      'enableAnalytics'
    ]);

    try {
      if (isAnalyticsEnabledSettings.enableAnalytics && IS_PROD) {
        isConnected()
          .then((connected: any) => {
            analytics.send('screenview', { cd: '/Home' });
            analytics.send(`pageview`, { dp: '/Home' });

            return connected;
          })
          .catch(() => {});
      }
    } catch (e) {
      log.error(e, `App -> runAnalytics`);
    }
  }

  public render() {
    const { classes: styles } = this.props;

    return (
      <div className={styles.root}>
        <CssBaseline>
          <MuiThemeProvider theme={appTheme}>
            <Titlebar />
            <Alerts />
            <ErrorBoundary>
              <SettingsDialog />
              <Routes />
            </ErrorBoundary>
          </MuiThemeProvider>
        </CssBaseline>
      </div>
    );
  }
}
const mapDispatchToProps = (dispatch: any, ownProps: any) =>
  bindActionCreators(
    {
      actionCreateCopyJsonFileToSettings: ({ ...data }) => () => {
        dispatch(copyJsonFileToSettings({ ...data }));
      },

      actionCreateFreshInstall: ({ ...data }) => (
        _: any,
        getState: GetState
      ) => {
        dispatch(freshInstall({ ...data }, getState));
      }
    },
    dispatch
  );

const mapStateToProps = () => {
  return {};
};

export default withReducer(
  'App',
  reducers
)(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(withStyles(styles as any)(hot(App)))
);
