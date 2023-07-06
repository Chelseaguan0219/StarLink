import React, { Component } from 'react';
import { Row, Col } from 'antd';
import axios from 'axios';
import SatSetting from './SatSetting';
import SatelliteList from './SatelliteList';
import WorldMap from './WorldMap';
import {
  SAT_API_KEY,
  BASE_URL,
  NEARBY_SATELLITE,
  STARLINK_CATEGORY,
} from '../constants';

class Main extends Component {
    constructor(){
        super();
        this.state = {
            //把一些state提到main
            satInfo:null,
            satList:null,
            setting:null,
            isLoadingList:false
        };
    }
   

  showNearbySatellite = (setting) => {
    //console.log('show nearby');
    this.setState({
      isLoadingList: true,
      setting: setting,
    });
    this.fetchSatellite(setting);
  };

  fetchSatellite = (setting) => {
    console.log('fetching');
    const { latitude, longitude, elevation, altitude } = setting;
    const url = `${BASE_URL}/${NEARBY_SATELLITE}/${latitude}/${longitude}/${elevation}/${altitude}/${STARLINK_CATEGORY}/&apiKey=${SAT_API_KEY}`;

    this.setState({
      isLoadingList: true,
    });

    axios
      .get(url)
      .then(response => {
        console.log(response.data);
        this.setState({
          satInfo: response.data,
          isLoadingList: false,
        })
      })
      .catch((error) => {
        // this.setState({
        //   isLoadingList: true,
        // });
        console.log('err in fetch satellite -> ', error);
      })
  }
  //user click track on the map 的时候这个函数会被trigger
  showMap = (selected) => {
    this.setState(preState => ({
        ...preState,
        satList:[...selected]
    }

    )

    )
  }

                                  
  render() {
    const { isLoadingList, satInfo, satList, setting} = this.state;

    return (
      <Row className="main">
        <Col span={8} className="left-side">
          <SatSetting onShow={this.showNearbySatellite} />
          <SatelliteList 
            satInfo={satInfo} 
            isLoad={this.state.isLoadingList} 
            //onShowMap跟showMap绑在一起了
            onShowMap={this.showMap} />
        </Col>
        <Col span={16} className="right-side">
          <WorldMap satData={satList} observerData={setting}/>
        </Col>
      </Row>
    );
  }
}

export default Main;
