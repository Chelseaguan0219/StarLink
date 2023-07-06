import React, { Component } from 'react';
import { List, Avatar, Button, Checkbox, Spin } from 'antd';
import satellite from '../assets/images/satellite.svg';

class SatelliteList extends Component {
    constructor(){
        super();
        this.state ={
            selected:[]
        };
    }

    onChange = e => {
        //1. 点的是谁； 2.勾选还是不勾选
        const {dataInfo,checked } = e.target; //checked:用户点击，onChange就被调用
        //不能直接修改，不能写只能读。如果想改写，需要一个新的[]然后覆盖
        const {selected} = this.state;
        //新的[]：每次勾选或者反勾选都会产生addorremove
        const list = this.addOrRemove(dataInfo, checked, selected)
        this.setState({
            selected:list
        });
    };
    //基于老数据，通过item（点的是谁), status（勾选还是反勾选)这两个信息去生成新数组
    addOrRemove = (item, status, list) => {
        //把some里的cb运行在这个list上的每一个元素。只要有一个cb里return true 那整个return true
        //some:检查一下一堆元素里 是否至少存在一个满足该条件的元素
        const found = list.some((entry) => entry.satid == item.satid);
        //!found: 在老数组里没有找到用户正在点的那个东西，那我们就要add item
        if(status && !found ){
            //spread: copy list and add item
            list = [...list, item];
        }
        //如果找到了但是是反选，我妈就要挪出数组
        if(!status && found){
            //会生成新数组，不会mutate老数组
            list = list.filter(entry => {
                return entry.satid != item.satid; 
            })
        }
        return list;
        };
        //点完track on the map之后要准备数据然后画图，为什么onShowSatMap不直接画要让顶层画？
        //因为main -> ss/sL/Map，底层之间是不能互通的，sl收集好data后必须通知main然后main再通知map传递data给map画图
        onShowSatMap = () => {
            //顶层component传递给它的一个函数 -> 上一层是main
            this.props.onShowMap(this.state.selected);
        }

  render() {
    const satList = this.props.satInfo ? this.props.satInfo.above : [];
    const { isLoad } = this.props;
    const {selected} = this.state;

    return (
      <div className="sat-list-box">
        <Button className="sat-list-btn" 
                size = "large"
                //数据记录的是已选中的，已选中为0就是没有选中 btn就被disabled
                disabled={ selected.length == 0}
                onClick={this.onShowSatMap}
                >
          Track on the Map
        </Button>
        <hr />

        {isLoad ? (
          <div className="spin-box">
            <Spin tip="Loading..." size="large" />
          </div>
        ) : (
          <List
            className="sat-list"
            itemLayout="horizontal"
            size="small"
            dataSource={satList}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Checkbox dataInfo={item} onChange={this.onChange} />,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar size={50} src={satellite} />}
                  title={<p>{item.satname}</p>}
                  description={`Launch Date: ${item.launchDate}`}
                />
              </List.Item>
            )}
          />
        )}
      </div>
    );
  }
}

export default SatelliteList;
