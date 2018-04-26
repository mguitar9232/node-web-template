/* eslint-disable no-undef */
(function (Acct2, $) {
    function clearChartData (chart) {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.data.datasets[0].label = '';

        chart.options.title.text = '';
        // chart.update();
    }

    function updateChart (chart, data) {
        // var min =  Math.min.apply(Math, data.map(function (o) { return o.byteSum; }));
        // var unit = checkByteUnit(min);
        data.forEach(function (item) {
            // chart.data.labels.push(item.dstNetMask);
            // chart.data.datasets[0].data.push(genByteUnit(item.byteSum, unit));
            // console.log(item);
            chart.data.labels.push(item.dstAs);
            chart.data.datasets[0].data.push(item.bpsAvg);
        });
        chart.data.datasets[0].label = 'bps average by dstAs (Gbps)'
        chart.update();
    }

    function updatePie (pie, data) {
        // var min =  Math.min.apply(Math, data.map(function (o) { return o.byteSum; }));
        // var unit = checkByteUnit(min);
        data.forEach(function (item) {
            pie.data.labels.push(item.ifaceOutAs);
            pie.data.datasets[0].data.push(item.bpsSum);
        });
        pie.options.title.text = 'bps sum by ifaceOut (Gbps)'
        pie.update();
    }

    function showToast (msg) {
        // console.log('show toast: ' + msg);
        window.plainToast.option({type: 'error', message: msg});
        window.plainToast.show();
    }

    /* options */
    // LoadingOverlay
    const LoadingOverlayOpt = {size: '10%', color: 'rgba(255, 255, 255, 0.6)'};
    // daterangepicker
    const drpOptions = {
        autoUpdateInput: true,
        singleDatePicker: true,
        startDate: moment(),
        minDate: moment().subtract(1, 'days'),
        maxDate: moment().add(1, 'days'),
        timePicker: true,
        timePicker24Hour: true,
        timePickerSeconds: true,
        locale: {
            format: 'YYYY-MM-DD HH:mm:ss'
        }
        // isInvalidDate: function (date) {
        //     if (moment(date).format('YYYY-MM-DD') === '2018-03-15') {
        //         return true;
        //     }
        // }
    };
    // chart
    const chartOptions = {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'bps average by dstAs (Gbps)',
                data: [],
                backgroundColor: '#F67280',
                borderColor: '#F67280',
                borderWidth: 1,
                fill: 'origin'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                xAxes: [{
                    display: true,
                    scaleLabel: {
                        display: false,
                        labelString: 'dstAs',
                        fontSize: 15,
                        padding: 1,
                        fontColor: '#000'
                    }
                }],
                yAxes: [{
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: 'Gbps'
                    }
                }]
            }
        }
    };
    // pie
    const pieColor = ['#6C567B', '#C06C84', '#F67280', '#51ADCF', '#35B0AB', '#F8B195', '#97b954', '#a167bf', '#f98684', '#eda053', '#4271c9', '#9fe0e0', '#ff7049', '#63e27f'];
    // const pieColor = ['#a167bf', '#f98684', '#eda053', '#4271c9', '#9fe0e0', '#ff7049', '#63e27f'];
    const pieOptions = {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: pieColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            title: {
                display: true,
                text: 'packet usage by ifaceOut'
            }
        }
    };

    function genSearchTimeHistory (arry, time) {
        arry.unshift(time);
        // keep history length (under 3)
        if (arry.length > 3) {
            arry.splice(3, 1);
        }
        var first = '<div class="pinkred inline">' + arry[0] + '</div>';
        // 2018-04-26 11:26:21
        return first + arry.join(', ').substring(19);
    }

    $(function () {
        /* flag */
        let isChartReqEnd = false;
        let cntFnDrawCB = 0;
        let isGridReqEnd = false;
        let searchHisArry = [];
        /* view  */
        const $dGridWrap = $('#acct2_gridwrap');
        let $dGrid;
        const $chart = $('#acct2_chart');
        const $pie = $('#acct2_pie');
        const $reqBtn = $('#acct2_btn_req');
        const $drp = $('#acct2_drp_date');
        const $chartYn = $('#acct2_inputc_chartYn');
        const $chartRow = $('#acct2_chartRow');
        const $intervalRType = $("input[name='acct2_inputr_intervalR']");          // radio name
        const $intervalMsg = $('#acct2_interval_msg');
        const $timehisMsg = $('#acct2_timehis_msg');
        // const $form = $('#acct2_form');                                         // parsley validation form
        const $contentWrap = $('#acct2_contentwrap');
        // ifo as modal
        const $ifoasModal = $('#acct2_modal_ifoas');
        const $ifoasModalBody = $('#acct2_body_ifoas');
        const $ifoasModalBtn = $('#acct2_btn_ifoas');
        const $nowBtn = $('#acct2_btn_now');

        /* init views */
        // init checkbox - icheckbox
        UtilsCmmn.initIcheckbox('acct2_icheck');
        // init drp
        var cal = UtilsCmmn.initDaterangepicker($drp, drpOptions);
        // init chart
        var chart = new Chart($chart, chartOptions);
        // init chart
        var pie = new Chart($pie, pieOptions);
        // init datatables
        let dtGrid;
        function initGrid (options) {
            // init datatables
            // activate spinner
            $contentWrap.LoadingOverlay('show', LoadingOverlayOpt);
            isGridReqEnd = false;
            // datatables
            dtGrid = $dGrid.dataTable({
                autoWidth: false,
                pageLength: 25,
                // pagingType: 'full_numbers',
                bPaginate: true,
                bLengthChange: false,
                bInfo: true,
                searching: true,
                ordering: true,
                order: [[ options.ifaceLength + 1, 'desc' ]],
                responsive: true,
                // bAutoWidth: false,
                // scrollX: true,
                bProcessing: false,
                // bServerSide: true,
                sAjaxSource: 'api/acct/test2/grid',
                sServerMethod: 'POST',
                fnServerParams: function (aoData) {
                    aoData.push({ name: 'strDate', value: $drp.val() });
                    aoData.push({ name: 'interval', value: $intervalRType.filter(':checked').val() });
                },
                fnDrawCallback: function (oSettings) {
                    // TODO : 임시로직
                    cntFnDrawCB++;
                    if (cntFnDrawCB === 2 && !isGridReqEnd) {
                        // if (oSettings.aiDisplay.length !== 0 && !isGridReqEnd) {
                        $contentWrap.LoadingOverlay('hide', true);
                        isGridReqEnd = true;
                        cntFnDrawCB = 0;
                        if (oSettings.aiDisplay.length === 0) {
                            showToast('해당 기간 데이터 없음');
                        }
                        // footer sum
                        var api = this.api();
                        for (let i = 1; i < options.ifaceLength + 2; i++) {
                            // console.log((api.column(i, {filter: 'applied'}).data().sum()).toFixed(2));
                            // $(api.column(i).footer()).html((api.column(i).data().sum()).toFixed(2) + ' Gbps');
                            if (i !== options.ifaceLength + 1) {
                                $(api.column(i).footer()).css('background-color', UtilsCmmn.hexToRGB(pieColor[i - 1], '0.4')).html((api.column(i).data().sum()).toFixed(2) + ' Gbps');
                            }
                            // if (i === 8 || i === 9) {
                            //     $(api.column(i).footer()).html('-');
                            // } else {
                            //     $(api.column(i).footer()).html(formatGByte(api.column(i).data().sum()) + ' GB');
                            // }
                        }
                    }
                    // console.log('fnDrawCallback:' + oSettings + '|cntFnDrawCB:' + cntFnDrawCB + '|options.ifaceLength:' + options.ifaceLength);
                },
                /*
                ajax: reqAjax({
                    success: function (data) {
                        $('#test1').DataTable().api().ajax.reload();
                    },
                    error: showToast
                }, {url: 'api/acct/test1/grid', param: {strDate: $drp.val()}}),
                ajax: {
                    url: 'api/acct/test1/grid',
                    type: 'POST',
                    data: {strDate: 1234},
                    // contentType: 'application/json;charset=UTF-8'
                },
                */
                columns: options.columns,
                columnDefs: [
                    { targets: [0], visible: false, searchable: false },
                    { className: 'text-right', targets: '_all' }
                    // { className: 'text-left', targets: -1 }
                ],
                fnInitComplete: function () {
                    $dGrid.css('width', '100%');
                    // footer(sum data) change location
                    var $footer = $($dGrid.api().table().footer());
                    $($dGrid.api().table().header()).append($footer.children().addClass('sum'));
                },
                dom: '<"html5buttons"B>lfrtip',
                buttons: [
                    {extend: 'copy'},
                    {extend: 'csv'},
                    {extend: 'excel', title: 'ExampleFile'},
                    {extend: 'pdf', title: 'ExampleFile'},
                    {extend: 'print',
                        customize: function (win) {
                            $(win.document.body).addClass('white-bg');
                            $(win.document.body).css('font-size', '10px');

                            $(win.document.body).find('table')
                                .addClass('compact')
                                .css('font-size', 'inherit');
                        }
                    }
                ]
            }).on('search.dt', function () {
                // footer sum
                var api = $dGrid.api();
                for (let i = 1; i < options.ifaceLength + 2; i++) {
                    // console.log((api.column(i, {filter: 'applied'}).data().sum()).toFixed(2));
                    $(api.column(i).footer()).html((api.column(i, {filter: 'applied'}).data().sum()).toFixed(2) + ' Gbps');
                }
            });
        }

        /* event control  */
        /* request event */
        $reqBtn.on('click', function (e) {
            // reset drow cb cnt!
            cntFnDrawCB = 0;
            // request chart
            var reqOpt = {url: 'api/acct/test2/chart', param: {strDate: $drp.val(), interval: $intervalRType.filter(':checked').val()}};
            reqChartData(reqOpt);
            var reqOptPie = {url: 'api/acct/test2/pie', param: {strDate: $drp.val(), interval: $intervalRType.filter(':checked').val()}};
            reqPieData(reqOptPie);
            // request grid - 1.create html from ifoList/grid query / 2. initgrid test2/grid query
            reqDynamicGrid({url: 'api/acct/ifoList/grid', param: {strDateYMD: $drp.val(), displayYn: 'Y'}});
            // update searched-date filed
            $timehisMsg.html('&nbsp&nbsp[searched : ' + genSearchTimeHistory(searchHisArry, $drp.val()) + ']');
            /*
            isGridReqEnd = false;
            $contentWrap.LoadingOverlay('show', LoadingOverlayOpt);
            dtGrid.fnClearTable();
            dtGrid.fnReloadAjax();
            */
        });

        /* request(now) event */
        $nowBtn.on('click', function (e) {
            // reset drow cb cnt!
            cntFnDrawCB = 0;
            // get now & set now to cal
            var now = moment().format('YYYY-MM-DD HH:mm:ss');
            cal.setStartDate(now);
            $drp.val(now);
            // request chart
            var reqOpt = {url: 'api/acct/test2/chart', param: {strDate: $drp.val(), interval: $intervalRType.filter(':checked').val()}};
            reqChartData(reqOpt);
            var reqOptPie = {url: 'api/acct/test2/pie', param: {strDate: $drp.val(), interval: $intervalRType.filter(':checked').val()}};
            reqPieData(reqOptPie);
            // request grid - 1.create html from ifoList/grid query / 2. initgrid test2/grid query
            reqDynamicGrid({url: 'api/acct/ifoList/grid', param: {strDateYMD: $drp.val(), displayYn: 'Y'}});
            // update searched-date filed
            $timehisMsg.html('&nbsp&nbsp[searched : ' + genSearchTimeHistory(searchHisArry, now) + ']');
            /*
            isGridReqEnd = false;
            $contentWrap.LoadingOverlay('show', LoadingOverlayOpt);
            dtGrid.fnClearTable();
            dtGrid.fnReloadAjax();
            */
        });

        /* own control  */
        // chart-row show/hide
        $chartYn.on('ifToggled', function (e) {
            if (this.checked) {
                $chartRow.show(800);
                $chartRow.fadeIn('slow', function () {
                    // setTimeout(AllDailySales.AllDailySalesView.reRenderView, 5);
                });
                // check chart request done
                if (!isChartReqEnd) $chartRow.LoadingOverlay('show', LoadingOverlayOpt);
            } else {
                $chartRow.LoadingOverlay('hide', true);
                $chartRow.hide(800);
                $chartRow.fadeOut('slow');
            }
        });

        // radio checked event
        $intervalRType.on('ifChecked', function (event) {
            $intervalMsg.html('&nbsp&nbsp' + $(this).val());
        });

        // modal-open
        $ifoasModalBtn.on('click', function () {
            $ifoasModalBody.load('/view/acct/ifoList', function () {
                $ifoasModal.modal({show: true});
            });
        });

        // modal-close
        $ifoasModal.on('hidden.bs.modal', function () {
            $nowBtn.trigger('click');
        });

        function reqChartData (reqOpt) {
            $chartRow.LoadingOverlay('show', LoadingOverlayOpt);
            isChartReqEnd = false;
            clearChartData(chart);
            UtilsCmmn.reqDefaultAjax({
                success: function (data) {
                    updateChart(chart, data);
                    $chartRow.LoadingOverlay('hide', true);

                    isChartReqEnd = true;
                },
                error: showToast
            }, reqOpt);
        }

        function reqPieData (reqOpt) {
            clearChartData(pie);
            UtilsCmmn.reqDefaultAjax({
                success: function (data) {
                    updatePie(pie, data);
                },
                error: showToast
            }, reqOpt);
        }

        // for dynamic grid
        function getColumns (objArry) {
            var ifCol = [];
            objArry.data.forEach(function (obj) {
                // ifCol.push({data: obj.ifaceOutAs});
                ifCol.push({data: obj.ifaceOut});
            });
            return [{data: 'regTime'}].concat(ifCol, [{data: 'bpsSum'}, {data: 'dstNetMask'}, {data: 'dstAs', className: 'text-left grid_dstAs'}]);
        }

        function reqDynamicGrid (reqOpt) {
            // isGridReqEnd = false;
            // $contentWrap.LoadingOverlay('show', LoadingOverlayOpt);
            UtilsCmmn.reqDefaultAjax({
                success: function (data) {
                    repaintHtml(data);
                    $dGrid = $('#acct2_grid');
                    var options = {};
                    options.columns = getColumns(data);
                    // console.log(JSON.stringify(options.columns));
                    options.ifaceLength = data.data.length;
                    // console.log(JSON.stringify(col));
                    initGrid(options);
                    $contentWrap.LoadingOverlay('hide', true);
                },
                error: showToast
            }, reqOpt);
        }

        function repaintHtml (objArry) {
            // header
            var tHeader = '';
            objArry.data.forEach(function (obj) {
                tHeader += '<th>' + obj.ifaceOutAs + '<br>[' + obj.ifaceOut + ']' + '</th>';
            });
            // footer
            var tFooter = '';
            for (var i = 0; i < objArry.data.length + 4; i++) {
                tFooter += '<td></td>';
            }
            $dGridWrap.empty();
            $dGridWrap.append(
                '<table id="acct2_grid" class="table table-striped table-bordered table-hover dataTables-example dataTable">' +
                '   <thead>' +
                '       <tr>' +
                '           <th rowspan="2" style="vertical-align: middle">regTime</th>' +
                '           <th colspan="' + objArry.data.length + '"style="vertical-align: middle">iface out</th>' +
                '           <th rowspan="2" style="vertical-align: middle">bpsSum</th>' +
                '           <th rowspan="2" style="vertical-align: middle">dstNetMask</th>' +
                '           <th rowspan="2" style="vertical-align: middle">dstAs</th>' +
                '       </tr>' +
                '       <tr>' + tHeader + '</tr>' +
                '   </thead>' +
                '   <tfoot>' +
                '       <tr>' + tFooter + '</tr>' +
                '   </tfoot>' +
                '</table>'
            );
        }

        // request chart, pie, dynamic-grid
        $reqBtn.trigger('click');
    });
}(window.Acct2 || {}, jquery));
