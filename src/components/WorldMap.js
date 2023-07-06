import React, { Component } from 'react';
import axios from 'axios';
import { Spin } from 'antd';
import { feature } from 'topojson-client';
import { geoKavrayskiy7 } from 'd3-geo-projection';
import { geoGraticule, geoPath } from 'd3-geo';
import { select as d3Select } from 'd3-selection';
import { schemeCategory10 } from 'd3-scale-chromatic';
import * as d3Scale from 'd3-scale';
import { timeFormat as d3TimeFormat } from 'd3-time-format';
import {
    WORLD_MAP_URL,
    SATELLITE_POSITION_URL,
    SAT_API_KEY,
  } from '../constants';

const width = 900;
const height = 600;

class WorldMap extends Component {
    constructor(){
        super();
        this.state = {
            isLoading: false,
            isDrawing: false,
        }
        
        this.map = null;
        //初始化了小圆圈
        this.color = d3Scale.scaleOrdinal(schemeCategory10);
        //新建这个reference
        this.refMap = React.createRef();
        this.refTrack = React.createRef();
    }

    //画地图：拿世界地图数据放在componentDidMount()
    componentDidMount() {
        //先用axios发一个get request到.json, 
        axios.get(WORLD_MAP_URL)
            .then(res => {
                //数据放到.data
                const { data } = res;
                //把世界地图数据翻译成d3可以理解的数组
                const land = feature(data, data.objects.countries).features;
                //专门画图的
                this.generateMap(land);
            })
            .catch(e => console.log('err in fecth world map data ', e.message))
    }
    //2-n次执行
    componentDidUpdate(prevProps, prevState, snapshot) {
        //上次用户选中的和这次是不是一样的，一样就不需要再画一次了
        //!不严谨因为satData是array，里面东西是不是一样
        if (prevProps.satData !== this.props.satData) {
            //传到observerData
          const { latitude, longitude, elevation, altitude, duration } =
            this.props.observerData;
          const endTime = duration * 60;
    
          this.setState({
            isLoading: true,
          });
          //n2yo不支持n个卫星填在一个id位置 所以选了n个就要calln次 -> 会有好多promise
          const urls = this.props.satData.map((sat) => {
            const { satid } = sat;
            const url = `/api/${SATELLITE_POSITION_URL}/${satid}/${latitude}/${longitude}/${elevation}/${endTime}/&apiKey=${SAT_API_KEY}`;
    
            return axios.get(url);
          });
          //好多promise全都回来再做
          Promise.all(urls)
            .then((res) => {
                //全部的返回结果
              const arr = res.map((sat) => sat.data);
              this.setState({
                isLoading: false,
                isDrawing: true,
              });
              //如果之前的drawing停止了
              if (!prevState.isDrawing) {
                //放到track里
                this.track(arr);
              } else {
                const oHint = document.getElementsByClassName('hint')[0];
                //如果没画完 warning
                oHint.innerHTML =
                  'Please wait for these satellite animation to finish before selection new ones!';
              }
            })
            .catch((e) => {
              console.log('err in fetch satellite position -> ', e.message);
            });
        }
      }
      
      track = (data) => {
        //sanity check
        if (!data[0].hasOwnProperty('positions')) {
          throw new Error('no position data');
          return;
        }
        //数据有多少个代表要画多少个点 所以要长度
        const len = data[0].positions.length;
        //用户写的duration
        const { duration } = this.props.observerData;
        //画的是时间
        const { context2 } = this.map;
        //timestamp 
        let now = new Date();
        //计算打点的次数
        let i = 0;
        //setInterval(): 每隔1000毫秒 做函数内的事情 这是每秒都要做的事
        let timer = setInterval(() => {
          //跑进该次的timestamp，
          let ct = new Date();
          //和now的那个timestamp做对比就能知道过去多少秒
          let timePassed = i === 0 ? 0 : ct - now;
          //format时间
          let time = new Date(now.getTime() + 60 * timePassed);
          //把上个画布擦掉
          context2.clearRect(0, 0, width, height);
          context2.font = 'bold 14px sans-serif';
          context2.fillStyle = '#333';
          context2.textAlign = 'center';
          //画在第二个canvas上
          context2.fillText(d3TimeFormat(time), width / 2, 10);
         
          //计数器>所有数据长度了
          if (i >= len) {
            //说明要停下了
            clearInterval(timer);
            //记录状态
            this.setState({ isDrawing: false });
            
            const oHint = document.getElementsByClassName('hint')[0];
            //清除计时器
            oHint.innerHTML = '';
            return;
          }
          //对于数组里的某一个数据未来的positions传给之前写好的文字drawSat
          data.forEach((sat) => {
            const { info, positions } = sat;
            this.drawSat(info, positions[i]);
          });
          //每隔60取一个数据 不然隔一秒一个就好像每动过
          i += 60;
        }, 1000);
      };
      //画点需要卫星的id + 位置（经纬度）
      drawSat = (sat, pos) => {
        const { satlongitude, satlatitude } = pos;
        //如果其中一个信息缺失(0, false, undefined, null,'')
        //但是经纬度是0的时候 是合理的 但是不画图所以code有bug
        //satlongitude !== undefined
        if (!satlongitude || !satlatitude) return;
        //拿到卫星名字
        const { satname } = sat;
        //正则表达式 对string组装 starlink-1111 就是把这个-挪走的写法
        const nameWithNumber = satname.match(/\d+/g).join('');
        //拿到投影，第二支笔
        const { projection, context2 } = this.map;
        //转换成坐标
        const xy = projection([satlongitude, satlatitude]);
        
        ////画一个卫星
        context2.fillStyle = this.color(nameWithNumber);
        context2.beginPath();
        //画弧线:横坐标 纵坐标 圆的半径 0 弧度
        context2.arc(xy[0], xy[1], 4, 0, 2 * Math.PI);
        //填充 实心圆
        context2.fill();
    
        context2.font = 'bold 11px sans-serif';
        context2.textAlign = 'center';
        //写上编号 x1111
        context2.fillText(nameWithNumber, xy[0], xy[1] + 14);
      };


    //land:数组with一堆obj 边界经纬度
    generateMap(land){
        //把地球铺平：geoKavrayskiy7()是其中一种铺平方式（纸质版世界地图那样）然后给参数
        const projection = geoKavrayskiy7()
            .scale(170)
            .translate([width / 2, height / 2])
            .precision(.1);
        //准备经纬度的线
        const graticule = geoGraticule();
        //拿到canvas的属性
        const canvas = d3Select(this.refMap.current)
        //设置画布本身宽高
            .attr("width", width)
            .attr("height", height);

        const canvas2 = d3Select(this.refTrack.current)
            .attr('width', width)
            .attr('height', height);
      
        
        //拿到context
        const context = canvas.node().getContext("2d");
        const context2 = canvas2.node().getContext('2d');
        //组装路径规划器：把投影和context给它 
        let path = geoPath()
            .projection(projection)
            .context(context);
        //数组里的每个国家经纬度逐个画一遍 画country
        land.forEach((ele) => {
            //笔的填充色
            context.fillStyle = '#B3DDEF';
            //笔的线的颜色
            context.strokeStyle = '#000';
            //透明度
            context.globalAlpha = 0.9;
            //开始路径规划
            context.beginPath();
            //使用路径规划
            path(ele);
            //填充
            context.fill();
            //画线
            context.stroke();

            //画经纬度网格线 但是没有外面一圈
            context.strokeStyle = 'rgba(220, 220, 220, 0.1)';
            context.beginPath();
            path(graticule());
            context.lineWidth = 0.4;
            context.stroke();
            
            //画网格的outline 边界
            context.beginPath();
            context.lineWidth = 0.5;
            path(graticule.outline());
            context.stroke();    
        });

        this.map = {
            projection: projection,
            graticule: graticule,
            context: context,
            context2: context2,
          };

    }

    render() {
        const { isLoading } = this.state;
        return (
            //要画图就要有canvas 然后要拿它的reference
            <div className="map-box">
                {isLoading ? (//拉数据的时候要有转圈圈效果
              <div className="spinner">
                <Spin tip="Loading..." size="large" />
              </div>
            ) : null}
            <canvas className="map" ref={this.refMap} />
            <canvas className="track" ref={this.refTrack} />
            <div className="hint" />
            </div>
            //两张canvas是因为不想画的时候把背景的画布给擦掉了 因为要画新点擦旧点
            //所以在背景的canvas铺上一张canvas画点
            
        );
    }

}

export default WorldMap;
