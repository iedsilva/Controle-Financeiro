(function () {
    'use strict';
    
    var homeCtrl = angular.module("myApp");
    homeCtrl.$inject = ['$scope', '$filter', 'MovimentacoesService', 'CommonService', 'UsuariosService'];

    homeCtrl.controller("homeCtrl", function($scope, $filter, MovimentacoesService, CommonService, UsuariosService){
        var vm = this;
        var receitas = [];
        var despesas = [];
        var template = {
                labels: [],
                data: []
            };  
        
        var theHelp = Chart.helpers; //just for generateLabels work
        vm.options = {
            legend: {
                display: true, 
                position: 'bottom',
                fullWidth: true,
                labels: {
                    generateLabels: function(chart){
                        var data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            return data.labels.map(function(label, i) {
                                var meta = chart.getDatasetMeta(0);
                                var ds = data.datasets[0];
                                var arc = meta.data[i];
                                var custom = arc && arc.custom || {};
                                var getValueAtIndexOrDefault = theHelp.getValueAtIndexOrDefault;
                                var arcOpts = chart.options.elements.arc;
                                var fill = custom.backgroundColor ? custom.backgroundColor : getValueAtIndexOrDefault(ds.backgroundColor, i, arcOpts.backgroundColor);
                                var stroke = custom.borderColor ? custom.borderColor : getValueAtIndexOrDefault(ds.borderColor, i, arcOpts.borderColor);
                                var bw = custom.borderWidth ? custom.borderWidth : getValueAtIndexOrDefault(ds.borderWidth, i, arcOpts.borderWidth);
                                return {
                                    // And finally : 
                                    text: currencyTransform(ds.data[i]) + " - " + label,
                                    fillStyle: fill,
                                    strokeStyle: stroke,
                                    lineWidth: bw,
                                    hidden: isNaN(ds.data[i]) || meta.data[i].hidden,
                                    index: i
                                };
                            });
                        }
                        return [];
                    }
                }
            },
            tooltips: {
                callbacks: {
                    title: function(tooltipItem, data) {
                        return "Categoria:";
                    },
                    label: function(tooltipItem, data) {
                        return (data.labels[tooltipItem.index]+' - '+currencyTransform(data.datasets[0].data[tooltipItem.index]));
                    }
                    // afterBody: function(tooltipItem, data) {
                    //     return "clique para saber mais...";
                    // },
                }
            }
        };

        vm.lineOptions = {
            elements:{ 
                backgroundColor: '#AACBBC'
                // borderWidth: 7,
                // line: { fill: false} 
            },
            title: {
                display: true,
                text: "Fluxo de Caixa"
            },
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            },
            tooltips: {
                callbacks: {
                    title: function(tooltipItem, data) {
                        return (data.labels[tooltipItem[0].index]);
                    },
                    label: function(tooltipItem, data) {
                        return currencyTransform(data.datasets[0].data[tooltipItem.index]);
                    }
                }
            }
        }
        
        init();

        function init(){
            var userId = CommonService.getUserId();
            UsuariosService.findById(userId).then(function(usuario){
                var user = usuario.data;
                MovimentacoesService.find({i_usuario: user.i_usuario}).then(function (data) {
                    if (!data.data.length) return;
                    _.filter(data.data, function(d){ 
                        d.tipo === 'receita' ?  receitas.push(d) : despesas.push(d);
                    });
                    vm.despesas = grafico(despesas);
                    vm.receitas = grafico(receitas);
                    vm.ondas = graficoOndas(_.orderBy(receitas.concat(despesas),'data', 'desc'), user.saldo);
                    vm.despesas.colors = ['#DC4C46', '#672E3B', '#F3D6E4', '#F2552C', '#B93A32', '#AD5D5D', '#9E4624', '#F7786B', '#DD4132', '#D65076'];
                    vm.ondas.color = ['#AACBBC'];
                });
            });
        }

        function grafico(data){
            var chart = angular.copy(template);
            _.forEach(data, function(d){
                if ( _.includes(chart.labels, d.i_categoria.descricao) ){
                    chart.data[chart.labels.indexOf(d.i_categoria.descricao)] += d.valor;
                    chart.labels[chart.labels.indexOf(d.i_categoria.descricao)] = d.i_categoria.descricao;//' - '+currencyTransform(d.valor);
                } else {
                    chart.labels.push(d.i_categoria.descricao);//+' - '+currencyTransform(d.valor));
                    chart.data.push(d.valor);
                }
            });
            return chart;
        }

        function graficoOndas(data, saldo){
            var chart = angular.copy(template);
            chart.fill = false;
            var saldoAtual = saldo;
            
            chart.labels.push(new Date());
            chart.data.push(saldo);
            
            _.forEach(data, function(d){
                d.tipo === 'receita' ? saldoAtual -= d.valor : saldoAtual += d.valor;
                if ( _.includes(chart.labels, d.data) ){
                    chart.data[chart.labels.indexOf(d.data)] = saldoAtual;
                } else {
                    chart.labels.push(d.data);
                    chart.data.push(saldoAtual);
                }
            });
            chart.data.pop();
            chart.data.unshift(saldo);
            
            chart.labels = chart.labels.slice().reverse();
            chart.labels = _.map(chart.labels, function(date){
                return dateTransform(date);
            })
            chart.data = chart.data.slice().reverse();
            return chart;
        }

        function dateTransform(date){
            return $filter('date')(date, "dd/MM");
        }
        function currencyTransform(curr){
            return $filter('currency')(curr);
        }
        
    })
})();

