-- Pico: Unique supporters (cumulative + weekly new)

WITH creator_wallets AS (
    SELECT address FROM (
        VALUES
            (0x0000000000000000000000000000000000000000) -- placeholder: replace with real creator wallets
    ) AS t(address)
),
pico_tokens AS (
    SELECT address FROM (
        VALUES
            (0xcebA9300f2b948710d2653dD7B07f33A8B32118C),
            (0x765DE816845861e75A25fCA122bb6898B8B1282a),
            (0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73),
            (0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787),
            (0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A)
    ) AS t(address)
),
first_support AS (
    SELECT
        t."from" AS supporter,
        MIN(date_trunc('week', evt_block_time)) AS first_week
    FROM celo.erc20_celo.evt_Transfer t
    INNER JOIN creator_wallets cw ON t."to" = cw.address
    INNER JOIN pico_tokens pt ON t.contract_address = pt.address
    GROUP BY 1
)

SELECT
    first_week AS week,
    COUNT(*) AS new_supporters,
    SUM(COUNT(*)) OVER (ORDER BY first_week) AS cumulative_supporters
FROM first_support
GROUP BY 1
ORDER BY 1 DESC
