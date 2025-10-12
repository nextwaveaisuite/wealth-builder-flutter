
import 'package:flutter/material.dart';

class WithdrawScreen extends StatefulWidget {
  const WithdrawScreen({super.key});
  @override
  State<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends State<WithdrawScreen> {
  final _amountCtrl = TextEditingController();
  String _plan = '';

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Withdraw', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        TextField(
          controller: _amountCtrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Amount (AUD)'),
        ),
        const SizedBox(height: 8),
        ElevatedButton(
          onPressed: () {
            final amt = double.tryParse(_amountCtrl.text.trim()) ?? 0;
            if (amt <= 0) return;
            setState(() {
              _plan = 'Proposed plan: Sell from safety sleeve first (VAF/GOLD) respecting min trade size.';
            });
          },
          child: const Text('Create Sell Plan'),
        ),
        const SizedBox(height: 12),
        Text(_plan),
      ],
    );
  }
}
