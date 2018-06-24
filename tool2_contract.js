
"use strict";

var cheerio = require('cheerio');
var superagent = require('superagent');
var _ = require('lodash');
var async = require('async');
var log4js = require('log4js');
var logger = log4js.getLogger("tool4");
var request = require("request");

var nebulas = require("nebulas"),
    Account = nebulas.Account,
    neb = new nebulas.Neb();
// neb.setRequest(new nebulas.HttpRequest("https://testnet.nebulas.io")); //test
neb.setRequest(new nebulas.HttpRequest("https://mainnet.nebulas.io")); //main

// var NebPay = require("nebpay.js");     //https://github.com/nebulasio/nebPay
// var nebPay = new NebPay();

// // var callbacks = NebPay.config.testnetUrl;
// var callbacks = NebPay.config.mainnetUrl;   //如果合约在主网,则使用这个

logger.level = 'debug';

function analyzeContract(contract) {

    var page = 1;
    var fetchUrl = `https://explorer.nebulas.io/main/api/tx?a=${contract}&p=${page}`

    superagent.get(fetchUrl).end((err, res) => {

        var totalPage = res.body.data.totalPage;
        var txnCnt = res.body.data.txnCnt;
        var txArr = [];
        var havecard = {};
        var havecardid = {};
        var arr = _.fill(Array(totalPage), 1);
        var index = 0;
        console.log("合约:", contract, "交易页数:", totalPage, "交易记录:", txnCnt);
        async.eachSeries(arr, (acc, callback) => {

            index++;
            var url = `https://explorer.nebulas.io/main/api/tx?a=${contract}&p=${index}`
            console.log(url)
            superagent.get(url).end((err, res) => {

                var txnList = res.body.data.txnList;

                _.each(txnList, (tx) => {
                    var _tx = {
                        address: tx.from.hash,
                        balance: tx.from.balance / 10 ** 18
                    }

                    var func = JSON.parse(tx.data).Function;

                    if (func == "draw") {

                        neb.api.getEventsByHash({ hash: tx.hash })
                            .then((events) => {
                                _.each(events.events, (event) => {
                                    var draws = JSON.parse(event.data).Draw;
                                    if (draws != undefined) {
                                        if (havecard[draws.from] == undefined) havecard[draws.from] = [];
                                        havecard[draws.from] = havecard[draws.from].concat(draws.tokens);
                                    }
                                });
                            })
                            .catch((e) => {
                                console.log("error");
                                console.log(e);
                            });

                    }

                    txArr.push(_tx);
                })

                setTimeout(function () {
                    callback(err);
                }, 100);

            });

        }, (err) => {

            var address = [];
            var arrs = [];

            _.each(txArr, function (tx) {
                if (address.indexOf(tx.address) == -1) {
                    address.push(tx.address);
                    arrs.push(tx)
                }
            })

            var totalNas = 0;

            _.each(arrs, function (tx) {
                totalNas += tx.balance;
            })

            console.log("合约", contract, "交易页数", totalPage, "交易记录", txArr.length, "去重后地址", arrs.length);

            arrs = arrs.sort((a, b) => {
                return b.balance - a.balance;
            });

            // console.log(havecard);

            for (let keys in havecard) {

                let values = havecard[keys];

                // neb.api.call({
                //     chainID: 1,
                //     from: "n1SYTt7eVMa6TuJrNg2DbmayfZAoyePYvTo",
                //     to: "n1gDfiiQLEBu95xDWHGxNi4qToyXjD2vE4D",
                //     value: 0,
                //     nonce: 12,
                //     gasPrice: 1,
                //     gasLimit: 1,
                //     contract: {
                //         function: "getCardsByAddress",
                //         args: JSON.stringify([keys])
                //     }
                // }).then(function (tx) {
                //     console.log(tx)
                //     havecardid[keys] = parseInt(tx.result);
                // }).catch((e) => {
                //     console.log(e);
                //     // s(value);
                // });

                _.each(values, (value) => {

                    var lis = (tx) => {
                        console.log(tx)
                        havecardid[keys] = parseInt(tx.result);
                    }
                    // nebPay.simulateCall(
                    //     "n1gDfiiQLEBu95xDWHGxNi4qToyXjD2vE4D", 
                    //     "0", 
                    //     "getHeroIdByTokenId", 
                    //     JSON.stringify([value]),
                    //     {    //使用nebpay的call接口去调用合约,
                    //         callback: callbacks,
                    //         listener: lis(e)
                    //     }
                    // );

                    var s = (value) => {

                        neb.api.call({
                            chainID: 1,
                            from: "n1SYTt7eVMa6TuJrNg2DbmayfZAoyePYvTo",
                            to: "n1gDfiiQLEBu95xDWHGxNi4qToyXjD2vE4D",
                            value: 0,
                            nonce: 12,
                            gasPrice: 1000000,
                            gasLimit: 1000000,
                            contract: {
                                function: "getHeroIdByTokenId",
                                args: JSON.stringify([value])
                            }
                        }).then(function (tx) {
                            // console.log(tx)
                            havecardid[keys] = parseInt(tx.result);
                        }).catch((e) => {
                            console.log("error in call" + value);
                            s(value);
                        });
                    }
                    s(value);
                })

            }
            fetchAccountInfo(arrs);

        })

    });

}


function analyzeAccount(acc, cb) {

    var account = acc.address;

    var page = 1;
    var fetchUrl = `https://explorer.nebulas.io/main/api/tx?a=${account}&p=${page}`


    superagent.get(fetchUrl).end((err, res) => {

        var totalPage = res.body.data.totalPage;
        var txnCnt = res.body.data.txnCnt;
        var txArr = [];
        var arr = _.fill(Array(totalPage), 1);
        var index = 0;

        async.eachSeries(arr, (acc, callback) => {

            index++;
            var url = `https://explorer.nebulas.io/main/api/tx?a=${account}&p=${index}`

            // console.log(url)
            superagent.get(url).end((err, res) => {

                var txnList = res.body.data.txnList;

                _.each(txnList, (tx) => {
                    txArr.push(tx)
                })

                setTimeout(function () {
                    callback(err);
                }, 100);

            });

        }, (err) => {

            var address = [];
            var arrs = [];

            var totalIn = 0;
            var totalOut = 0;

            var inCount = 0;
            var outCount = 0;

            _.each(txArr, function (tx) {

                if (tx.type == 'binary') {
                    var _value = tx.value / 10 ** 18;
                    var from = tx.from.hash;
                    var to = tx.to.hash;
                    if (account == from) {
                        // logger.error("out:", _value)
                        totalOut += _value;
                        outCount++;
                    }

                    if (account == to) {
                        // logger.error("in:", _value)
                        totalIn += _value;
                        inCount++;
                    }
                }


                if (address.indexOf(tx.from.hash) == -1) {
                    address.push(tx.from.hash);
                    arrs.push(tx)
                }

                if (address.indexOf(tx.to.hash) == -1) {
                    address.push(tx.to.hash);
                    arrs.push(tx)
                }

            })

            console.log("账户", account, "余额:", acc.balance, "交易记录", txArr.length, "去重", arrs.length, "totalOut", totalOut, "totalIn", totalIn, "inCount", inCount, "outCount", outCount);

            cb();

        })

    });

}

function fetchAccountInfo(accounts) {

    console.log("------------调用该合约的所有账户三维--------------")

    var totalNas = 0;

    var accountInfoArr = [];

    async.eachSeries(accounts, (acc, callback) => {

        var page = 1;
        var fetchUrl = `https://explorer.nebulas.io/main/api/address/${acc.address}`

        superagent.get(fetchUrl).end((err, res) => {

            var address = res.body.data.address;

            acc.txCnt = res.body.data.txCnt;

            try {
                acc.bls = address.balance / 10 ** 18;
            } catch (e) {
                console.log("mmm");
                console.log(res.body);
                acc.bls = 0;
            }
            totalNas += acc.bls;

            analyzeAccount(acc, function () {
                callback()
            });

        });

    }, (err) => {
        console.log();
        console.log("合约", contract, "去重后账户地址", accounts.length, "总资金", totalNas);

    })
}


var contract = process.argv[2];

if (!contract) {
    logger.error("请输入contract")
    return;
}

analyzeContract(contract);

// n1rgn8N7JnKrN4B8WnnWFRKqL2ZJChxzm3d 周冠军1 手气红包 
// n1kzpjFz4Xcn49bL8ey2RsvsaAZ1HCcEFug 周亚军1
// n1xD5nS3FNhtsdCMXQvajSD1PgwJt44fKGW 周季军1

// n1kANa7WxWXEFZhkAfYo9WQSQ3yGGQUq8cQ 周冠军2 细胞进化 *

// n1pphX1uMEVN188DhTzPd3mihxWDB98ubfm 周亚军2 NRC20 Suite
// n1fq61gLN7ZGgf7v7cXou5xw9BAEYqMAJhp 周季军2 Fair & Trustworthy Contracts 2.0

// n1qpiEBU5JaYvP3b4ip3tg3KFbrBovZJKSC coffee pro *

// n1xUWAdNhtbMH3fo8gAHcDo4EWggBEeYpPL 理财宝 * 去重后账户地址 94 总资金 10587.657298721777
// 账户 n1MMknk9XhGPd5mLMomdyJ3p8njNKxnWbjS 余额: 7298.582876519135 交易记录 120 去重 45 totalOut 169.58280300000004 totalIn 7591.45568185456 inCount 11 outCount 40
// 账户 n1LaWXjr6fsVF8cawUerZCTjcFQNHeVCdva 余额: 1732.67284472584 交易记录 14 去重 12 totalOut 28.003028200000003 totalIn 1976.1758732 inCount 3 outCount 5
// 账户 n1V4vFg7VZ85t42vgWbFizhTQsDrte9TX1z 余额: 310.28448789210205 交易记录 55 去重 15 totalOut 724.635521 totalIn 1170.1000099999999 inCount 3 outCount 10
// 账户 n1MpWts585nkbwtHDCujtX2J9NcjD6rNaXW 余额: 293.557009172842 交易记录 47 去重 19 totalOut 190.43831400000002 totalIn 649.177324 inCount 10 outCount 3
// 账户 n1YLKz6f8H8xTpJkeBN4fxE7S6wUW38c7Dw 余额: 105.625657871179 交易记录 10 去重 8 totalOut 1.702374 totalIn 108.3272101 inCount 3 outCount 1


// n1jWpKadorv27XgSbo4WRZvsyCdAajkEP4B bbs * 
// n1oXPK4pGpqDLYoZKvpVUot2gbzveF7Aizz nebulas.cool *

// n22bGU1XMjyEqpZWUmeRLXqFpkVu3GPoPza 打飞机
// n1eRG54Agy1XiaqBMJy2hCBWkYVow4giLVk 付费阅读
// n1toGTjVNeAruuwhv3SB7hFdo8enhQVHMv4 星云影评网
// n1yWmszfMy19rzSespfigbLXFESgkJJU3WR lifejourney
// n1oNBGmoRpgKDBwJZRvXoX28SJDyZPwwT7y 51join
// n1yD4WebwG31JsRCCRwSvU6EgS7FgHPYb5b 520表白墙


//week2 top10
// n1wi1kQfmNMkzDN3v7DA4QVCaKJbFJsgzUv GOLD Token 去重后账户地址 2 总资金 197313.35548690447  
// 账户 n1LUCKY1xqCEZX7DBxJZNLUVtMwXXK89Fqf 余额: 197313.1004687158 交易记录 176 去重 64 totalOut 2005.4602 totalIn 209206.75868099 inCount 9 outCount 5

// n1zsohpv63CnmUs7aeVBfgeQBozpK5bmTMk 星云共享平台 去重后账户地址 13 总资金 61228.999046021534
// 账户 n1Qzak3wucQ7FQfSR3P8eyY6JMSKpcZfvAz 余额: 51000.00262472176 交易记录 193 去重 15 totalOut 10130.497999999998 totalIn 61130.50564000002 inCount 39 outCount 28
// 账户 n1S5t8thQEvR6eXYX9qjuqKVC4fsHUBevdS 余额: 10100.399999718406 交易记录 14 去重 5 totalOut 1 totalIn 10101.4 inCount 5 outCount 2

// n1toGTjVNeAruuwhv3SB7hFdo8enhQVHMv4 星云影评网 去重后账户地址 100 总资金 5015.280804656427
// 账户 n1G8z4mGvMyw27kmctS3CkQrxW3WDaugrQz 余额: 3008.807057781659 交易记录 159 去重 107 totalOut 2006.4738391195028 totalIn 5015.2809 inCount 6 outCount 100
// 账户 n1Lmbt5Tq6mgsoZS3QPrCqpxaHZXLNc16eN 余额: 20.27401081059698 交易记录 52 去重 6 totalOut 0 totalIn 20.27401184229798 inCount 2 outCount 0

// n1u9zobv4XvXwiX4aY9D1hQuufgerCBDT3z 布道者论坛 去重后账户地址 12 总资金 61183.406817040326
// 账户 n1Qzak3wucQ7FQfSR3P8eyY6JMSKpcZfvAz 余额: 51000.00262472176 交易记录 193 去重 15 totalOut 10130.497999999998 totalIn 61130.50564000002 inCount 39 outCount 28
// 账户 n1S5t8thQEvR6eXYX9qjuqKVC4fsHUBevdS 余额: 10100.399999718406 交易记录 14 去重 5 totalOut 1 totalIn 10101.4 inCount 5 outCount 2

// n1znJdVcGewMrwAk9rNS2JQsxNUx1AcEDh6 商品溯源 去重后账户地址 14 总资金 51303.89370528112
// 账户 n1Qzak3wucQ7FQfSR3P8eyY6JMSKpcZfvAz 余额: 51000.00262472176 交易记录 193 去重 15 totalOut 10130.497999999998 totalIn 61130.50564000002 inCount 39 outCount 28
// 账户 n1UttvZsKuqEijkCcG886ZRvPFpsMH2wmVz 余额: 110.886778626015 交易记录 63 去重 23 totalOut 1001.11011 totalIn 1112 inCount 3 outCount 15
// 账户 n1LSwsEAGSKAbtLG4UZPD56w9iPHLmQKKyd 余额: 110.00000969709399 交易记录 16 去重 7 totalOut 0 totalIn 110.00001 inCount 2 outCount 0
// 账户 n1YypstuKoZMYysY6jtp8YKXNdWojuQH8pp 余额: 83.003898466101 交易记录 116 去重 8 totalOut 0.03910000000000003 totalIn 83.0430000000002 inCount 47 outCount 40

// n233EsTRKjH4vCgrR9Yo1opnZSvVRA5f2Xs 星云空投 http://nasdrop.info/   去重后账户地址 283 总资金 17107.685221146545
// n21SN7Ud7t8KJXL2iUcghobbmrwGAU4Et9W 币又多 https://nas.biyouduo.com/   去重后账户地址 222 总资金 2752.6247184781305
// n1wETHTrkQmq4k1UreqfkZmEuebEBfKYWvX nas game http://nasgame.xyz/
// n1kSSQQ7kfobomJqAnSnABch6xPxGRAZg88 宠物召唤 https://wakara.gpu360.com/

// n1qQhDzswApj5SmRrNQBNd6nSjqaaqmmmZi 恐龙公园 http://dpark.cc 去重后账户地址 157 总资金 8861.152784248952
// https://explorer.nebulas.io/#/tx/4d45b7597067833d8c002f4a9b10360fd8f75b853064de711f6f0b325df2449b
// 账户 n1MMknk9XhGPd5mLMomdyJ3p8njNKxnWbjS 余额: 7298.582876519135 交易记录 120 去重 45 totalOut 169.58280300000004 totalIn 7591.45568185456 inCount 11 outCount 40
// 账户 n1K2gngiDxchJdMVCYvezi4dDawSdxganCZ 余额: 827.227328271984 交易记录 11 去重 4 totalOut 1170.1 totalIn 1998.3273284 inCount 5 outCount 2
// 账户 n1V4vFg7VZ85t42vgWbFizhTQsDrte9TX1z 余额: 310.28448789210205 交易记录 55 去重 15 totalOut 724.635521 totalIn 1170.1000099999999 inCount 3 outCount 10
// 账户 n1MpWts585nkbwtHDCujtX2J9NcjD6rNaXW 余额: 293.557009172842 交易记录 47 去重 19 totalOut 190.43831400000002 totalIn 649.177324 inCount 10 outCount 3
// 账户 n1KsFEUuHVqTNgRx1g7vPn9ba52LALtQGg4 余额: 42.80271304777 交易记录 74 去重 25 totalOut 444.44145004 totalIn 487.3032644 inCount 11 outCount 19


//n1wGdG8duB8MMEbCZsSELA9z5dtpPd2bpUX 恐龙星球 


