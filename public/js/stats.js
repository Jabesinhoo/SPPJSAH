document.addEventListener('DOMContentLoaded', async () => {
    // Colores para los gráficos que funcionan bien en modo claro y oscuro
    const chartColors = {
        blue: { light: '#3B82F6', dark: '#60A5FA' },
        green: { light: '#10B981', dark: '#34D399' },
        yellow: { light: '#F59E0B', dark: '#FBBF24' },
        red: { light: '#EF4444', dark: '#F87171' },
        purple: { light: '#8B5CF6', dark: '#A78BFA' },
        indigo: { light: '#6366F1', dark: '#818CF8' },
        orange: { light: '#F97316', dark: '#FB923C' },
        pink: { light: '#EC4899', dark: '#F472B6' },
        cyan: { light: '#06B6D4', dark: '#22D3EE' },
        lime: { light: '#84CC16', dark: '#A3E635' }
    };

    // Determinar si estamos en modo oscuro
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches || document.documentElement.classList.contains('dark');

    // Función para obtener color según el modo
    const getColor = (colorName) => isDarkMode ? chartColors[colorName].dark : chartColors[colorName].light;

    const fetchData = async (url) => {
        const res = await fetch(url);
        return await res.json();
    };

    try {
        // Cargar todas las estadísticas en paralelo
        const [
            generalStats,
            timeStats,
            topUsers,
            topProducts,
            brandStats  // 🆕 NUEVA: Estadísticas de marcas
        ] = await Promise.all([
            fetchData('/api/products/stats/general'),
            fetchData('/api/products/stats/time-faltantes-realizado'),
            fetchData('/api/products/stats/top-users'),
            fetchData('/api/products/stats/top-products'),
            fetchData('/api/products/stats/brands')  // 🆕 NUEVO endpoint para marcas
        ]);

        // Actualizar tarjetas de resumen
        const totalProducts = generalStats.reduce((acc, stat) => acc + stat.count, 0);
        document.getElementById('total-products').textContent = totalProducts;
        document.getElementById('total-products').classList.remove('pulse');

        const completedCategory = generalStats.find(stat => stat.categoria === 'Realizado');
        document.getElementById('completed-products').textContent = completedCategory ? completedCategory.count : '0';
        document.getElementById('completed-products').classList.remove('pulse');

        document.getElementById('avg-time').textContent = timeStats.promedioMinutos + ' min';
        document.getElementById('avg-time').classList.remove('pulse');

        document.getElementById('total-users').textContent = topUsers.length;
        document.getElementById('total-users').classList.remove('pulse');

        // Llenar la tabla de estadísticas por categoría
        const tableBody = document.getElementById('stats-table-body');
        tableBody.innerHTML = '';

        generalStats.forEach(stat => {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${stat.categoria}</td>
    <td class="px-6 py-4 whitespace-nowrap text-sm">${stat.count}</td>
    <td class="px-6 py-4 whitespace-nowrap text-sm">${stat.avgImportance} ⭐</td>
    <td class="px-6 py-4 whitespace-nowrap text-sm">${stat.totalQuantity}</td>
    <td class="px-6 py-4 whitespace-nowrap text-sm">$${stat.avgPrice}</td>
    <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">$${stat.totalValue}</td>
  `;
  tableBody.appendChild(row);
});



        // Tabla de top productos
        document.getElementById('loadingTopProducts').style.display = 'none';
        const topProductsTableBody = document.getElementById('top-products-table-body');
        document.getElementById('tableTopProducts').classList.remove('hidden');

        topProducts.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">${p.SKU}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">${p.nombre}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-right">${p.total}</td>
            `;
            topProductsTableBody.appendChild(row);
        });

        // 🆕 NUEVA LÓGICA PARA ESTADÍSTICAS DE MARCAS 🆕
        document.getElementById('loadingBrands').style.display = 'none';
        document.getElementById('tableBrands').classList.remove('hidden');

        const brandsTableBody = document.getElementById('brands-table-body');
        // Tomar solo las top 10 marcas
        const topBrands = brandStats.slice(0, 10);

        topBrands.forEach(brand => {
    const row = document.createElement('tr');
    row.innerHTML = `
  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${brand.marca || 'Sin marca'}</td>
  <td class="px-6 py-4 whitespace-nowrap text-sm">${brand.count}</td>
  <td class="px-6 py-4 whitespace-nowrap text-sm">${brand.avgImportance} ⭐</td>
  <td class="px-6 py-4 whitespace-nowrap text-sm">${brand.totalQuantity}</td>
  <td class="px-6 py-4 whitespace-nowrap text-sm">$${brand.avgPrice}</td>
  <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">$${brand.totalValue}</td>
`;

    brandsTableBody.appendChild(row);
});


        // 🆕 GRÁFICO DE DISTRIBUCIÓN POR MARCA 🆕
        document.getElementById('loadingBrandsChart').style.display = 'none';

        // Preparar datos para el gráfico de marcas (top 8 marcas)
        const topBrandsForChart = brandStats.slice(0, 8);
        const otherBrandsCount = brandStats.slice(8).reduce((acc, brand) => acc + brand.count, 0);

        const brandLabels = [
            ...topBrandsForChart.map(b => b.marca || 'Sin marca'),
            ...(otherBrandsCount > 0 ? ['Otras marcas'] : [])
        ];

        const brandData = [
            ...topBrandsForChart.map(b => b.count),
            ...(otherBrandsCount > 0 ? [otherBrandsCount] : [])
        ];

        // Colores para el gráfico de marcas
        const brandColors = [
            getColor('blue'), getColor('green'), getColor('yellow'), getColor('red'),
            getColor('purple'), getColor('indigo'), getColor('orange'), getColor('pink'),
            getColor('cyan'), getColor('lime')
        ];

        new Chart(document.getElementById('chartBrands'), {
            type: 'pie',
            data: {
                labels: brandLabels,
                datasets: [{
                    data: brandData,
                    backgroundColor: brandColors.slice(0, brandLabels.length)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: isDarkMode ? '#E5E7EB' : '#374151',
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const value = context.raw;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Top usuarios
        document.getElementById('loadingTopUsers').style.display = 'none';

        new Chart(document.getElementById('chartTopUsers'), {
            type: 'bar',
            data: {
                labels: topUsers.map(u => u.usuario),
                datasets: [{
                    label: 'Productos agregados',
                    data: topUsers.map(u => u.total),
                    backgroundColor: getColor('green')
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: isDarkMode ? '#E5E7EB' : '#374151'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: isDarkMode ? '#9CA3AF' : '#6B7280'
                        },
                        grid: {
                            color: isDarkMode ? '#374151' : '#E5E7EB'
                        }
                    },
                    x: {
                        ticks: {
                            color: isDarkMode ? '#9CA3AF' : '#6B7280'
                        },
                        grid: {
                            color: isDarkMode ? '#374151' : '#E5E7EB'
                        }
                    }
                }
            }
        });

        // Tiempo promedio
        document.getElementById('loadingTime').style.display = 'none';
        document.getElementById('time-description').textContent =
            `Basado en ${timeStats.total} productos completados`;

        new Chart(document.getElementById('chartTime'), {
            type: 'doughnut',
            data: {
                labels: ['Tiempo promedio (minutos)'],
                datasets: [{
                    data: [timeStats.promedioMinutos],
                    backgroundColor: [getColor('yellow')]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: isDarkMode ? '#E5E7EB' : '#374151'
                        }
                    }
                }
            }
        });

        // Categorías
        document.getElementById('loadingCategories').style.display = 'none';

        new Chart(document.getElementById('chartCategories'), {
            type: 'pie',
            data: {
                labels: generalStats.map(c => c.categoria),
                datasets: [{
                    data: generalStats.map(c => c.count),
                    backgroundColor: [
                        getColor('red'),
                        getColor('yellow'),
                        getColor('green'),
                        getColor('blue'),
                        getColor('purple')
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: isDarkMode ? '#E5E7EB' : '#374151'
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error al cargar las estadísticas:', error);
        // Mostrar mensajes de error en cada sección
        document.querySelectorAll('.loading').forEach(el => {
            el.innerHTML = '<div class="text-red-500">Error al cargar los datos</div>';
        });
        document.getElementById('stats-table-body').innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-red-500">Error al cargar los datos</td>
            </tr>
        `;
    }
});