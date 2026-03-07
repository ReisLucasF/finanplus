'use client'

import { useEffect, useRef } from 'react'

interface PieChartProps {
    title: string
    data: { name: string; value: number; color?: string }[]
}

export default function PieChart({ title, data }: PieChartProps) {
    const chartRef = useRef<HTMLDivElement>(null)
    const chartInstanceRef = useRef<any>(null)

    useEffect(() => {
        if (!chartRef.current || !data || data.length === 0) return

        const loadHighcharts = async () => {
            const Highcharts = (await import('highcharts')).default

            
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy()
            }

            
            const chartData = data.map((item) => {
                const dataPoint: any = {
                    name: item.name,
                    y: item.value
                }

                
                if (item.color) {
                    dataPoint.color = item.color
                }

                return dataPoint
            })

            console.log(' PieChart - Dados recebidos:', data)
            console.log(' PieChart - Dados processados:', chartData)

            chartInstanceRef.current = Highcharts.chart(chartRef.current!, {
                chart: {
                    type: 'pie',
                    backgroundColor: 'transparent'
                },
                title: {
                    text: title,
                    style: {
                        color: '#e5e7eb',
                        fontWeight: '600',
                        fontSize: '16px'
                    }
                },
                tooltip: {
                    pointFormat: '<b>{point.percentage:.1f}%</b><br/>Valor: R$ {point.y:,.2f}',
                    backgroundColor: 'rgba(31, 41, 55, 0.95)',
                    borderWidth: 1,
                    borderColor: '#4b5563',
                    style: {
                        color: '#e5e7eb'
                    }
                },
                legend: {
                    enabled: true,
                    align: 'center',
                    verticalAlign: 'bottom',
                    layout: 'horizontal',
                    itemStyle: {
                        color: '#e5e7eb',
                        fontWeight: 'normal'
                    },
                    itemHoverStyle: {
                        color: '#ffffff'
                    },
                    itemMarginTop: 5,
                    itemMarginBottom: 5
                },
                plotOptions: {
                    pie: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        showInLegend: true,
                        dataLabels: {
                            enabled: true,
                            format: '<b>{point.name}</b><br/>{point.percentage:.1f}%',
                            style: {
                                color: '#e5e7eb',
                                fontSize: '12px',
                                fontWeight: '500',
                                textOutline: '2px solid rgba(0, 0, 0, 0.8)'
                            },
                            distance: 15
                        },
                        states: {
                            hover: {
                                brightness: 0.15
                            },
                            inactive: {
                                opacity: 0.4
                            }
                        }
                    }
                },
                series: [{
                    name: title,
                    type: 'pie',
                    data: chartData
                }],
                credits: {
                    enabled: false
                }
            })
        }

        loadHighcharts()

        
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy()
            }
        }
    }, [data, title])

    return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
}
