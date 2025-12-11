<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Да, можешь подготовить как несколько json?

Ниже пример набора мок‑данных в формате JSON для главной страницы дашборда. Их можно положить в отдельные файлы или отдавать как разные эндпоинты бэкенда.

## Общие замечания

Та же логика полей, что и в витрине: суммы и количества берутся из платёжных инструкций (INSTR_AMOUNT, INSTR_COUNT, VALUE_DATE, TRXN_STATUS и др.), а атрибуты клиентов и MCC — из соответствующих колонок FCT_PAYMENTS и FCT_RDM_IPS.[^1][^2]
Все данные ниже вымышленные; объёмы и даты можно свободно менять под сценарий демо, сохраняя структуру полей и типы.[^2]

***

## JSON для KPI (kpi_summary)

Этот JSON заполняет верхние карточки: объём операций, количество, средний чек, отказы, активные клиенты и среднее время обработки за выбранный период.[^2]
Предполагается, что на каждый набор фильтров фронтенд получает один объект (или массив из одного объекта).

```json
[
  {
    "period_label": "Сегодня",
    "date_from": "2025-03-01",
    "date_to": "2025-03-01",
    "total_amount": 1250000.50,
    "total_count": 18420,
    "avg_ticket": 67.87,
    "rejected_count": 320,
    "rejected_share_pct": 1.74,
    "active_clients_count": 942,
    "avg_proc_time_sec": 12.4
  },
  {
    "period_label": "Вчера",
    "date_from": "2025-02-28",
    "date_to": "2025-02-28",
    "total_amount": 1185000.10,
    "total_count": 17500,
    "avg_ticket": 67.71,
    "rejected_count": 290,
    "rejected_share_pct": 1.66,
    "active_clients_count": 910,
    "avg_proc_time_sec": 11.8
  }
]
```


***

## JSON для динамики по дням (timeseries_daily)

Этот JSON нужен для линейного/area‑графика по дням с разбивкой по статусу (например, успешные и отклонённые операции), основываясь на датах VALUE_DATE/ACCEPT_DATE и статусах TRXN_STATUS.[^2]
Каждая запись — агрегация за день и конкретный статус.

```json
[
  {
    "date": "2025-03-01",
    "status": "SUCCESS",
    "trx_count": 18240,
    "trx_amount": 1238000.40,
    "avg_ticket": 67.87,
    "rejected_count": 0,
    "rejected_share_pct": 0.0
  },
  {
    "date": "2025-03-01",
    "status": "REJECTED",
    "trx_count": 180,
    "trx_amount": 9200.10,
    "avg_ticket": 51.11,
    "rejected_count": 180,
    "rejected_share_pct": 100.0
  },
  {
    "date": "2025-03-02",
    "status": "SUCCESS",
    "trx_count": 19120,
    "trx_amount": 1310500.00,
    "avg_ticket": 68.57,
    "rejected_count": 0,
    "rejected_share_pct": 0.0
  },
  {
    "date": "2025-03-02",
    "status": "REJECTED",
    "trx_count": 210,
    "trx_amount": 10450.30,
    "avg_ticket": 49.76,
    "rejected_count": 210,
    "rejected_share_pct": 100.0
  }
]
```


***

## JSON для статусов/воронки (status_overview)

Этот JSON описывает агрегированную «воронку обработки» для выбранного периода по этапам и статусам (например, получено, обработано, успешно, отклонено) на базе TRXN_STATUS, FACT_STATUS и признаков IS_REJECTED_INSTR/IS_REJECTED_DOC.[^2]
Используется для воронки или столбчатой диаграммы по шагам обработки.

```json
[
  {
    "stage": "RECEIVED",
    "status_code": "R",
    "trx_count": 19000,
    "share_pct": 100.0,
    "avg_proc_time_sec": 0.0
  },
  {
    "stage": "PROCESSED_OK",
    "status_code": "P",
    "trx_count": 18680,
    "share_pct": 98.3,
    "avg_proc_time_sec": 11.5
  },
  {
    "stage": "REJECTED",
    "status_code": "X",
    "trx_count": 320,
    "share_pct": 1.7,
    "avg_proc_time_sec": 8.2
  }
]
```


***

## JSON для топ‑клиентов (top_clients)

Этот JSON питает таблицу/бар‑чарт топ‑дебиторов и кредиторов по сумме и количеству операций, используя атрибуты DEBTOR_NAME, DEBTOR_ACCOUNT, CREDITOR_NAME и CREDITOR_ACCOUNT.[^2]
Поле role позволяет одним и тем же компонентом визуализации показывать как плательщиков, так и получателей.

```json
[
  {
    "role": "DEBTOR",
    "client_name": "ООО \"Торговый Дом Альфа\"",
    "client_account": "40702810900000001234",
    "trx_count": 540,
    "trx_amount": 780000.00,
    "avg_ticket": 1444.44,
    "rejected_count": 6,
    "rejected_share_pct": 1.11
  },
  {
    "role": "DEBTOR",
    "client_name": "ООО \"Бета Логистика\"",
    "client_account": "40702810400000005678",
    "trx_count": 430,
    "trx_amount": 520000.50,
    "avg_ticket": 1209.30,
    "rejected_count": 4,
    "rejected_share_pct": 0.93
  },
  {
    "role": "CREDITOR",
    "client_name": "ИП Петров С.В.",
    "client_account": "40802810900000009876",
    "trx_count": 320,
    "trx_amount": 150000.00,
    "avg_ticket": 468.75,
    "rejected_count": 2,
    "rejected_share_pct": 0.63
  }
]
```


***

## JSON для MCC‑аналитики (mcc_summary)

Этот JSON нужен для диаграммы по MCC: сумма, количество, средний чек и доля отказов по каждой категории, основанный на поле MCC в витринах.[^1][^2]
Можно добавить поле mcc_name, если на фронтенде или в бэкенде есть справочник расшифровок MCC.

```json
[
  {
    "mcc": "5411",
    "mcc_name": "Grocery Stores",
    "trx_count": 4200,
    "trx_amount": 210000.00,
    "avg_ticket": 50.00,
    "rejected_count": 40,
    "rejected_share_pct": 0.95
  },
  {
    "mcc": "5812",
    "mcc_name": "Restaurants",
    "trx_count": 3100,
    "trx_amount": 260000.00,
    "avg_ticket": 83.87,
    "rejected_count": 25,
    "rejected_share_pct": 0.81
  },
  {
    "mcc": "6011",
    "mcc_name": "ATMs",
    "trx_count": 1200,
    "trx_amount": 60000.00,
    "avg_ticket": 50.00,
    "rejected_count": 5,
    "rejected_share_pct": 0.42
  }
]
```

Если нужно, можно добавить ещё один JSON для распределения по банкам (по BIC/участнику) по аналогии с top_clients — структура будет почти такая же, только вместо клиентов будут поля с идентификаторами и названиями банков.[^1][^2]

<div align="center">⁂</div>

[^1]: FCT_RDM_IPS.tab

[^2]: FCT_PAYMENTS.tab

