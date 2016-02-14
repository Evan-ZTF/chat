﻿
var app=angular.module("chatRoom",[]);
var info={};
app.factory('socket', function($rootScope) {
    var socket = io(); //默认连接部署网站的服务器
    return {
        on: function(eventName, callback) {
            socket.on(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {   //手动执行脏检查
                    callback.apply(socket, args);
                });
            });
        },
        emit: function(eventName, data, callback) {
            socket.emit(eventName, data, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    if(callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        }
    };
});

app.factory('randomColor', function($rootScope) {
    return {
        newColor: function() {
            return '#'+('00000'+(Math.random()*0x1000000<<0).toString(16)).slice(-6);
        }
    };
});

app.factory('userService', function($rootScope) {
    return {
        get: function(users,nickname) {
            if(users instanceof Array){
                for(var i=0;i<users.length;i++){
                    if(users[i].nickname===nickname){
                        return users[i];
                    }
                }
            }else{
                return null;
            }
        }
    };
});

app.controller("chatCtrl",['$scope','socket','randomColor','userService',function($scope,socket,randomColor,userService){
    var messageWrapper= $('.message-wrapper');
    $scope.hasLogined=false;
    $scope.receiver="";//默认是群聊
    $scope.publicMessages=[];//群聊消息
    $scope.privateMessages={};//私信消息
    $scope.messages=$scope.publicMessages;//默认显示群聊
    $scope.users=[];//
    $scope.color=randomColor.newColor();//当前用户头像颜色
    $scope.login=function(){   //登录进入聊天室
        socket.emit("addUser",{nickname:$scope.nickname,userImg:$scope.userImg});
    }
    $scope.scrollToBottom=function(){
        messageWrapper.scrollTop(messageWrapper[0].scrollHeight);
    }

    $scope.postMessage=function(){

        var msg={text:$scope.words,type:"normal",userImg:$scope.userImg,from:$scope.nickname,to:$scope.receiver};
        var rec=$scope.receiver;
        if(rec){  //私信
           if(!$scope.privateMessages[rec]){
               $scope.privateMessages[rec]=[];
           }
            $scope.privateMessages[rec].push(msg);
        }else{ //群聊
            $scope.publicMessages.push(msg);
        }
        $scope.words="";
        if(rec!==$scope.nickname) { //排除给自己发的情况
            socket.emit("addMessage", msg);
        }
        $('#messageInput').focus();
        // console.log('sss');
    }
    $scope.toggle=function(){
        // $('#userInterface').hide();$('#messageInterface').show();
        $('#meInterface').hide();
        $('#messageInterface').hide();
        $('.footer').show();
        $('#userInterface').show();
        $('.icon-contacts,.icon-mes').parent().removeClass('active')
        $('.icon-wechat').parent().addClass('active');
        console.log('toogle');

    }



    $scope.messageShow=function(){
        console.log('messageShow');
        $('#messageInterface').show();
        $('#meInterface').hide();
        $('#userInterface').hide();
        $('.icon-contacts,.icon-mes').parent().removeClass('active')
        $('.icon-wechat').parent().addClass('active');

        $('.footer').hide()
    }

    $scope.chatShow=function(){
        console.log('chatshow');
        $('#messageInterface').hide();
        $('#meInterface').hide();
        $('#userInterface').show();
        $('.icon-contacts,.icon-mes').parent().removeClass('active')
        $('.icon-wechat').parent().addClass('active');

        $('.footer').show()
    }
    $scope.meShow=function(){
        console.log('meShow')

        $('#meInterface').show();
        $('#userInterface').hide();
        $('#messageInterface').hide();
        $('.footer').show();

        $('.icon-contacts,.icon-wechat').parent().removeClass('active')
        $('.icon-mes').parent().addClass('active');
    }

    $scope.setReceiver=function(receiver){
         if($('#userInterface').is(':hidden')){
            $('#userInterface').show();
            $('#messageInterface').hide();
            $('#meInterface').hide()
            $('.icon-contacts,.icon-mes').parent().removeClass('active')
            $('.icon-wechat').parent().addClass('active');
            $('.footer').show()
        }else{

            $('#userInterface').hide();
            $('#messageInterface').show();
            $('.footer').hide()
            $('#meInterface').hide();
            $('.icon-contacts,.icon-wechat').parent().removeClass('active')
            $('.icon-mes').parent().addClass('active');
        }


        $scope.receiver=receiver;
        if(receiver){ //私信用户
            if(!$scope.privateMessages[receiver]){
                $scope.privateMessages[receiver]=[];
            }
            $scope.messages=$scope.privateMessages[receiver];
        }else{//广播
            $scope.messages=$scope.publicMessages;
        }
        var user=userService.get($scope.users,receiver);
        if(user){
            user.hasNewMessage=false;
        }
    }

    //收到登录结果
    socket.on('userAddingResult',function(data){
        if(data.result){
            $scope.userExisted=false;
            $scope.hasLogined=true;
        }else{//昵称被占用
            $scope.userExisted=true;
        }
    });
    //收到登录结果
    socket.on('sendMsg',function(data){
        $scope.nickname=data.name;
        $scope.userImg=data.userImg;
        $scope.hasLogined=true;
        socket.emit("addUser",{nickname:$scope.nickname,userImg:$scope.userImg});
        //登录
        console.log(data)
        info=data

    });

    //接收到欢迎新用户消息
    socket.on('userAdded', function(data) {
        if(!$scope.hasLogined) return;
        $scope.publicMessages.push({text:data.nickname,type:"welcome"});
        $scope.users.push(data);
    });

    //接收到在线用户消息
    socket.on('allUser', function(data) {
        if(!$scope.hasLogined) return;
        $scope.users=data;
    });

    //接收到用户退出消息
    socket.on('userRemoved', function(data) {
        if(!$scope.hasLogined) return;
        $scope.publicMessages.push({text:data.nickname,type:"bye"});
        for(var i=0;i<$scope.users.length;i++){
            if($scope.users[i].nickname==data.nickname){
                $scope.users.splice(i,1);
                return;
            }
        }
    });

    //接收到新消息
    socket.on('messageAdded', function(data) {
        if(!$scope.hasLogined) return;
        if(data.to){ //私信
            if(!$scope.privateMessages[data.from]){
                $scope.privateMessages[data.from]=[];
            }
            $scope.privateMessages[data.from].push(data);
        }else{//群发
            $scope.publicMessages.push(data);
        }
        var fromUser=userService.get($scope.users,data.from);
        var toUser=userService.get($scope.users,data.to);
        if($scope.receiver!==data.to) {//与来信方不是正在聊天当中才提示新消息
            if (fromUser && toUser.nickname) {
                fromUser.hasNewMessage = true;//私信
            } else {
                toUser.hasNewMessage = true;//群发
            }
        }
    });



}]);

app.directive('message', ['$timeout',function($timeout) {
    return {
        restrict: 'E',
        templateUrl: 'http://'+window.location.hostname+':3004/message',
        scope:{
            info:"=",
            self:"=",
            scrolltothis:"&"
        },
        link:function(scope, elem, attrs){
                scope.time=new Date();
                $timeout(scope.scrolltothis);
                $timeout(function(){
                    // elem.find('.avatar').css('background',"rgb(255,0,0)");
                });
        }
    };
}])
    .directive('user', ['$timeout',function($timeout) {
        return {
            restrict: 'E',
            templateUrl: 'http://'+window.location.hostname+':3004/user',
            scope:{
                info:"=",
                iscurrentreceiver:"=",
                setreceiver:"&"
            },
            link:function(scope, elem, attrs,chatCtrl){
                $timeout(function(){
                    // elem.find('.avatar').css('background');
                });
            }
        };
    }]);
